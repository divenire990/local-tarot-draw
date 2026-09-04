import os
import sys
import time
import glob
import signal
import subprocess
import urllib.request
from PIL import Image
import cloakbrowser

PORT = 3005
URL = f"http://localhost:{PORT}"
USER_DATA_DIR = os.environ.get(
    "CLOAKBROWSER_PROFILE",
    os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "cloakbrowser-profile"),
)
FRAME_DIR = r"assets\frames"
os.makedirs(FRAME_DIR, exist_ok=True)
os.makedirs("assets", exist_ok=True)

def clean_frames():
    for f in glob.glob(os.path.join(FRAME_DIR, "*.png")):
        try:
            os.remove(f)
        except Exception:
            pass

clean_frames()

print("Starting Next.js production server on port", PORT)
server_proc = subprocess.Popen(
    ["node", "node_modules/next/dist/bin/next", "start", "-p", str(PORT)],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

def wait_for_server(timeout=20):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(URL, timeout=1) as resp:
                if resp.status == 200:
                    print("Server is ready at", URL)
                    return True
        except Exception:
            time.sleep(0.4)
    return False

if not wait_for_server():
    print("Failed to start server within timeout!")
    server_proc.kill()
    sys.exit(1)

frame_count = 0
def capture(page, tag=""):
    global frame_count
    frame_count += 1
    path = os.path.join(FRAME_DIR, f"frame_{frame_count:03d}_{tag}.png")
    page.screenshot(path=path)
    print(f"Captured frame {frame_count:02d}: {tag}")
    return path

try:
    print("Launching CloakBrowser persistent context...")
    browser = cloakbrowser.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 820},
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    page = browser.pages[0] if browser.pages else browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 820})

    print("Navigating to", URL)
    page.goto(URL, wait_until="domcontentloaded", timeout=15000)
    time.sleep(1.2)

    # 1. Initial State
    capture(page, "01_initial")

    # 2. Click "创建抽牌会话"
    create_btn = page.locator("button:has-text('创建抽牌会话')")
    create_btn.first.wait_for(state="visible", timeout=10000)
    create_btn.first.click()
    time.sleep(0.6)
    capture(page, "02_session_created")

    # 3. Click "洗牌"
    shuffle_btn = page.locator("button:has-text('洗牌')")
    shuffle_btn.first.wait_for(state="visible", timeout=5000)
    shuffle_btn.first.click()
    for i in range(4):
        time.sleep(0.35)
        capture(page, f"03_shuffle_{i+1}")

    # 4. Click "切牌"
    time.sleep(0.5)
    cut_btn = page.locator("button:has-text('切牌')")
    cut_btn.first.wait_for(state="visible", timeout=5000)
    cut_btn.first.click()
    time.sleep(0.35)
    capture(page, "04_cut_1")
    time.sleep(0.35)
    capture(page, "04_cut_2")

    # 5. Draw 3 cards
    time.sleep(0.6)
    card_indices = [10, 25, 40]
    for draw_num, card_idx in enumerate(card_indices, 1):
        print(f"Drawing card {draw_num}...")
        cards = page.locator("button:has(img[alt='塔罗牌背面'])")
        count = cards.count()
        print(f"Available deck cards: {count}")
        if count > card_idx:
            cards.nth(card_idx).click(force=True)
        elif count > 0:
            cards.first.click(force=True)
        
        for step in range(3):
            time.sleep(0.35)
            capture(page, f"05_draw{draw_num}_step{step+1}")
    # 6. Reading complete state
    time.sleep(1.0)
    capture(page, "06_reading_complete")

    # High quality screenshot for reading
    reading_img_path = r"assets\screenshot-reading.png"
    page.screenshot(path=reading_img_path)
    print(f"Saved {reading_img_path}")

    # 7. Select a drawn card in spread to inspect interpretation
    spread_cards = page.locator(".spread-slot, [data-slot-index], button:has(img:not([alt='塔罗牌背面']))")
    if spread_cards.count() > 0:
        spread_cards.first.click()
        time.sleep(0.5)
        capture(page, "07_inspect_card")
        deck_img_path = r"assets\screenshot-deck.png"
        page.screenshot(path=deck_img_path)
        print(f"Saved {deck_img_path}")

    # 8. Click save button
    save_btn = page.locator("button:has-text('保存本次抽牌')")
    if save_btn.count() > 0:
        save_btn.first.click()
        time.sleep(0.6)
        capture(page, "08_saved")

finally:
    try:
        browser.close()
    except Exception:
        pass
    try:
        server_proc.terminate()
        server_proc.wait(timeout=3)
    except Exception:
        server_proc.kill()

# Process captured frames into demo.gif
frame_files = sorted(glob.glob(os.path.join(FRAME_DIR, "*.png")))
print(f"Total valid frames captured: {len(frame_files)}")

if len(frame_files) >= 5:
    images = []
    for f in frame_files:
        im = Image.open(f).convert("RGB")
        # Resize to clean 960x615
        im_resized = im.resize((960, 615), Image.Resampling.LANCZOS)
        # Quantize with adaptive palette
        im_quant = im_resized.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        images.append(im_quant)

    gif_path = r"assets\demo.gif"
    images[0].save(
        gif_path,
        save_all=True,
        append_images=images[1:],
        duration=320,
        loop=0,
        optimize=True
    )
    print(f"Successfully generated {gif_path} (size: {os.path.getsize(gif_path):,} bytes)")

    # Save 4 sample frames for visual inspection
    indices = [0, len(images)//3, (2*len(images))//3, len(images)-1]
    for i, idx in enumerate(indices, 1):
        sample_path = f"assets/sample_frame_{i}.png"
        frame_files_idx = frame_files[idx]
        img_sample = Image.open(frame_files_idx)
        img_sample.save(sample_path)
        print(f"Extracted sample inspection frame {sample_path}")

print("Demo capture completed!")
