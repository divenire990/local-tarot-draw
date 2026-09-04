import type { Suit, TarotCard } from "@/lib/tarot/types";

const majorArcana = [
  ["愚者", "The Fool"],
  ["魔术师", "The Magician"],
  ["女祭司", "The High Priestess"],
  ["女皇", "The Empress"],
  ["皇帝", "The Emperor"],
  ["教皇", "The Hierophant"],
  ["恋人", "The Lovers"],
  ["战车", "The Chariot"],
  ["力量", "Strength"],
  ["隐者", "The Hermit"],
  ["命运之轮", "Wheel of Fortune"],
  ["正义", "Justice"],
  ["倒吊人", "The Hanged Man"],
  ["死神", "Death"],
  ["节制", "Temperance"],
  ["恶魔", "The Devil"],
  ["高塔", "The Tower"],
  ["星星", "The Star"],
  ["月亮", "The Moon"],
  ["太阳", "The Sun"],
  ["审判", "Judgement"],
  ["世界", "The World"],
] as const;

const suitMeta: Record<
  Exclude<Suit, null>,
  {
    nameZh: string;
    aceNameZh: string;
    short: string;
    numbers: string[];
    courts: Array<[string, string, string]>;
  }
> = {
  wands: {
    nameZh: "权杖",
    aceNameZh: "权杖王牌",
    short: "w",
    numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    courts: [
      ["侍从", "Page", "p"],
      ["骑士", "Knight", "n"],
      ["皇后", "Queen", "q"],
      ["国王", "King", "k"],
    ],
  },
  cups: {
    nameZh: "圣杯",
    aceNameZh: "圣杯王牌",
    short: "c",
    numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    courts: [
      ["侍从", "Page", "p"],
      ["骑士", "Knight", "n"],
      ["皇后", "Queen", "q"],
      ["国王", "King", "k"],
    ],
  },
  swords: {
    nameZh: "宝剑",
    aceNameZh: "宝剑王牌",
    short: "s",
    numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    courts: [
      ["侍从", "Page", "p"],
      ["骑士", "Knight", "n"],
      ["皇后", "Queen", "q"],
      ["国王", "King", "k"],
    ],
  },
  pentacles: {
    nameZh: "星币",
    aceNameZh: "星币王牌",
    short: "p",
    numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    courts: [
      ["侍从", "Page", "p"],
      ["骑士", "Knight", "n"],
      ["皇后", "Queen", "q"],
      ["国王", "King", "k"],
    ],
  },
};

function createMajorCards(): TarotCard[] {
  return majorArcana.map(([nameZh, nameEn], index) => ({
    cardId: `major-${String(index).padStart(2, "0")}-${nameEn.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    nameZh,
    nameEn,
    arcana: "major",
    suit: null,
    rank: String(index),
    imagePath: `/cards/rider-waite-smith/major/${index}m.jpg`,
  }));
}

function createMinorCards(): TarotCard[] {
  return (Object.entries(suitMeta) as Array<[Exclude<Suit, null>, (typeof suitMeta)[Exclude<Suit, null>]]>).flatMap(
    ([suit, meta]) => {
      const numberedCards = Array.from({ length: 10 }, (_, index) => {
        const number = index + 1;
        const nameZh = number === 1 ? meta.aceNameZh : `${meta.nameZh}${meta.numbers[index]}`;
        const nameEn = number === 1 ? `Ace of ${capitalizeSuit(suit)}` : `${number} of ${capitalizeSuit(suit)}`;
        return {
          cardId: `minor-${suit}-${String(number).padStart(2, "0")}`,
          nameZh,
          nameEn,
          arcana: "minor" as const,
          suit,
          rank: String(number),
          imagePath: `/cards/rider-waite-smith/${suit}/${number}${meta.short}.jpg`,
        };
      });

      const courtCards = meta.courts.map(([zh, en, code], index) => ({
        cardId: `minor-${suit}-${["page", "knight", "queen", "king"][index]}`,
        nameZh: `${meta.nameZh}${zh}`,
        nameEn: `${en} of ${capitalizeSuit(suit)}`,
        arcana: "minor" as const,
        suit,
        rank: en.toLowerCase(),
        imagePath: `/cards/rider-waite-smith/${suit}/${code}${meta.short}.jpg`,
      }));

      return [...numberedCards, ...courtCards];
    },
  );
}

function capitalizeSuit(suit: Exclude<Suit, null>): string {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
}

export const tarotDeck: TarotCard[] = [...createMajorCards(), ...createMinorCards()];

export const tarotBackImagePath = "/cards/rider-waite-smith/back.png";
