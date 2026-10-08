import type { Category } from "@/modules/community/categories";
import type { BikeStructure } from "@/modules/workouts/structure";
import type { Text } from "./seed-data";

/**
 * The demo's Trænerrummet (docs/adr/0054): made-up coaches from made-up
 * clubs, talking the way coaches do, in every category, with one session
 * to take into the library. Names and clubs are invented and belong to
 * nobody; no rider is named, as the room asks of everyone.
 */

export type DemoCoach = { name: string; club: string };

const METTE: DemoCoach = { name: "Mette Lund", club: "Fjordbyen CK" };
const JONAS: DemoCoach = { name: "Jonas Bak", club: "Bakkely Cykelklub" };
const ANDERS: DemoCoach = { name: "Anders Holt", club: "Østerå CK" };
const LENE: DemoCoach = { name: "Lene Brandt", club: "Kildevang CK" };

export type DemoReply = { by: DemoCoach; daysAgo: number; body: Text };

export type DemoThread = {
  category: Category;
  by: DemoCoach;
  daysAgo: number;
  title: Text;
  body: Text;
  workout?: { name: Text; plannedMinutes: number; structure: BikeStructure };
  replies: DemoReply[];
};

const threshold: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 900, target: { kind: "zone", zone: 2 } },
    {
      kind: "repeat",
      times: 3,
      steps: [
        { kind: "step", intent: "work", seconds: 480, target: { kind: "zone", zone: 4 } },
        { kind: "step", intent: "recover", seconds: 240, target: { kind: "zone", zone: 1 } },
      ],
    },
    { kind: "step", intent: "cooldown", seconds: 600, target: { kind: "zone", zone: 1 } },
  ],
};

export const ROOM_THREADS: DemoThread[] = [
  {
    category: "training",
    by: ANDERS,
    daysAgo: 9,
    title: {
      da: "Del: 3 × 8 min ved tærskel til januar",
      en: "Sharing: 3 × 8 min at threshold for January",
    },
    body: {
      da: "Det er vores faste tærskelpas, når basisintervallerne begynder efter nytår. Det ligger én gang om ugen og aldrig dagen før et styrkepas. Tag det gerne med i jeres eget bibliotek og ret det til.",
      en: "This is our regular threshold session once the base intervals start after New Year. It sits once a week and never the day before a strength session. Feel free to take it into your own library and adjust it.",
    },
    workout: {
      name: { da: "3 × 8 min tærskel", en: "3 × 8 min threshold" },
      plannedMinutes: 61,
      structure: threshold,
    },
    replies: [
      {
        by: LENE,
        daysAgo: 8,
        body: {
          da: "Tak. Vi kører det på rullerne i januar, når det er mørkt om eftermiddagen.",
          en: "Thank you. We will ride it on the trainer in January, when the afternoons are dark.",
        },
      },
    ],
  },
  {
    category: "training",
    by: METTE,
    daysAgo: 6,
    title: { da: "Hvor meget intensitet i december?", en: "How much intensity in December?" },
    body: {
      da: "Vi har seks U19-ryttere, og flere af dem kører hårdt, hver gang de er ude i en gruppe. Jeg overvejer at lægge vinteren an på mest rolig træning og ét hårdt pas om ugen. Hvordan fordeler I intensiteten fra november til februar?",
      en: "We have six U19 riders, and several of them ride hard every time they are out in a group. I am thinking of building the winter on mostly easy riding and one hard session a week. How do you spread the intensity from November to February?",
    },
    replies: [
      {
        by: JONAS,
        daysAgo: 5,
        body: {
          da: 'Vi har slået "Lav intensitet først" til under Holdet. Fordelingen i sæsonplanen viste, at tempopassene fyldte en tredjedel af pasene. Nu ligger de fleste i lav zone, og fra januar har vi ét hårdt pas om ugen.',
          en: 'We turned on "Low intensity first" under Team. The spread in the season plan showed that tempo sessions made up a third of them. Now most sit in the low zone, and from January we have one hard session a week.',
        },
      },
      {
        by: ANDERS,
        daysAgo: 4,
        body: {
          da: "Det samme her. Det hjalp at sige til rytterne, at et roligt pas er et rigtigt pas. Gruppeturene kører vi med en træner forrest, så tempoet holder.",
          en: "Same here. It helped to tell the riders that an easy session is a real session. We ride the group rides with a coach at the front, so the pace holds.",
        },
      },
      {
        by: METTE,
        daysAgo: 3,
        body: {
          da: "Tak, begge to. Jeg prøver profilen frem til jul og ser, hvordan fordelingen ændrer sig.",
          en: "Thank you both. I will try the profile until Christmas and see how the spread changes.",
        },
      },
    ],
  },
  {
    category: "strength",
    by: LENE,
    daysAgo: 5,
    title: {
      da: "Styrke for førsteårs U17: hvor starter I?",
      en: "Strength for first-year U17: where do you start?",
    },
    body: {
      da: "Vi får fire nye U17-ryttere, som aldrig har løftet. Starter I med DCU's program, eller bruger I noget andet det første halve år?",
      en: "We have four new U17 riders who have never lifted. Do you start with DCU's programme, or something else for the first six months?",
    },
    replies: [
      {
        by: JONAS,
        daysAgo: 4,
        body: {
          da: "Vi starter med DCU's U17-program fra biblioteket og bruger de første uger på teknik med lette vægte. To pas om ugen med mindst 48 timer imellem passer godt ind ved siden af skolen.",
          en: "We start with DCU's U17 programme from the library and spend the first weeks on technique with light weights. Two sessions a week with at least 48 hours between them fit well beside school.",
        },
      },
      {
        by: METTE,
        daysAgo: 4,
        body: {
          da: "Vi gør det samme og har en fysioterapeut med første gang, så alle får vist øvelserne rigtigt.",
          en: "We do the same and bring a physiotherapist the first time, so everyone is shown the exercises properly.",
        },
      },
    ],
  },
  {
    category: "wellbeing",
    by: JONAS,
    daysAgo: 4,
    title: {
      da: "Når en rytter mister lysten i november",
      en: "When a rider loses the joy in November",
    },
    body: {
      da: "En af vores andetårs U19 har kørt meget lidt de sidste uger og siger, at det ikke er sjovt længere. Hvordan griber I sådan en samtale an?",
      en: "One of our second-year U19 riders has ridden very little the last few weeks and says it is not fun any more. How do you go about that conversation?",
    },
    replies: [
      {
        by: LENE,
        daysAgo: 3,
        body: {
          da: "Jeg spørger først til skole og venner, før vi taler om cykling. Ofte handler det om noget andet. Et par uger uden plan har også hjulpet hos os.",
          en: "I ask about school and friends first, before we talk about cycling. Often it is about something else. A couple of weeks without a plan has helped us too.",
        },
      },
      {
        by: ANDERS,
        daysAgo: 2,
        body: {
          da: "Check-in'en hjælper os med at se det tidligt. Når energien ligger lavt en hel uge, tager jeg en snak, før træningen fylder for meget.",
          en: "The check-in helps us see it early. When energy stays low for a whole week, I have a talk before the training takes up too much.",
        },
      },
    ],
  },
  {
    category: "races",
    by: ANDERS,
    daysAgo: 3,
    title: { da: "Løbskalender for U17 i foråret", en: "A spring race calendar for U17" },
    body: {
      da: "Hvor mange løb lægger I ind for en førsteårs U17 fra april til juni? Vi har haft ryttere, der kørte næsten hver weekend og var trætte i juni.",
      en: "How many races do you plan for a first-year U17 from April to June? We have had riders who raced nearly every weekend and were tired by June.",
    },
    replies: [
      {
        by: METTE,
        daysAgo: 2,
        body: {
          da: "Vi vælger to eller tre løb, der betyder mest, og lægger dem som A- og B-løb i kalenderen. Så viser formkurven, om der er luft nok imellem.",
          en: "We pick the two or three races that matter most and put them in the calendar as A and B races. Then the form curve shows whether there is room enough between them.",
        },
      },
      {
        by: JONAS,
        daysAgo: 1,
        body: {
          da: "Vi aftaler løbene med rytteren og forældrene i februar. Det giver ro, når alle ved, hvad der kommer.",
          en: "We agree the races with the rider and the parents in February. It gives calm when everyone knows what is coming.",
        },
      },
    ],
  },
  {
    category: "equipment",
    by: LENE,
    daysAgo: 2,
    title: {
      da: "Gearing til U17: hvordan finder I den rigtige kassette?",
      en: "Gearing for U17: how do you find the right cassette?",
    },
    body: {
      da: "En rytter rykker op i U17 og skal have tjekket gearet. Hvad gør I for at være sikre på, at cyklen holder sig inden for reglerne?",
      en: "A rider is moving up to U17 and needs the gearing checked. What do you do to be sure the bike stays within the rules?",
    },
    replies: [
      {
        by: METTE,
        daysAgo: 1,
        body: {
          da: "Vi bruger gearingberegneren under Viden og beregnere. Den regner rulleudlægget ud fra klinge, kassette og dæk og viser kassetter, der passer. Ved første løb spørger vi kommissæren.",
          en: "We use the gearing calculator under Guides and calculators. It works out the roll-out from chainring, cassette and tyre and shows cassettes that fit. At the first race we ask the commissaire.",
        },
      },
    ],
  },
  {
    category: "dcu",
    by: JONAS,
    daysAgo: 1,
    title: { da: "DCU's timetal for andetårs U19", en: "DCU's hours for second-year U19" },
    body: {
      da: "Bruger I DCU's timer som mål eller som en ramme? Vores sæsonplan følger DCU's tal, men to af rytterne kan ikke nå dem ved siden af gymnasiet.",
      en: "Do you use DCU's hours as a target or as a range? Our season plan follows DCU's numbers, but two of the riders cannot reach them beside upper secondary school.",
    },
    replies: [
      {
        by: ANDERS,
        daysAgo: 1,
        body: {
          da: "Vi bruger dem som en ramme. Afvigelsen står i sæsonplanen, og så aftaler vi med rytteren, hvad der er realistisk ved siden af skolen.",
          en: "We use them as a range. The deviation is shown in the season plan, and then we agree with the rider what is realistic beside school.",
        },
      },
      {
        by: LENE,
        daysAgo: 0,
        body: {
          da: "Vi har slået DCU's guidning fra for vores U23-hold og lægger egne timer. For de yngre beholder vi den, fordi den giver en god start.",
          en: "We have turned DCU's guidance off for our U23 team and set our own hours. For the younger ones we keep it, because it gives a good start.",
        },
      },
    ],
  },
];
