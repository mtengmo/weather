# Promptguide: Roliga väderikoner för väderkod-projektet

## Arkitektur (viktigt för kodprojektet)

Generera **två separata lager** som du sedan lägger ihop i koden (t.ex. som två `<img>`/SVG staplade på varandra, eller composited i canvas):

1. **Bakgrundslager – väderscen** (54 st: 27 koder × dag/natt)
2. **Karaktärslager – "Vädergubben"** (25 st: 5 nederbördskategorier × 5 temperaturband)

Karaktärens kläder styrs alltså av **två faktorer tillsammans**: regnar det får hen regnrock/paraply, snöar det vinterkläder, är det torrt och varmt badkläder — och temperaturen justerar hur extremt det blir (från "lite sur" till "eskimåfrusen"). Det ger 27 × 2 × 5 = 270 möjliga kombinationer i appen, men bara **79 bilder att generera** (54 + 25).

Kodmappning till nederbördskategori (avgör vilken karaktärsbas som ska visas):

| Kategori | Koder |
|---|---|
| Torrt (ingen nederbörd) | 1, 2, 3, 4, 5, 6, 7 |
| Regn | 8, 9, 10, 18, 19, 20 |
| Åska | 11, 21 |
| Slask (snöblandat regn) | 12, 13, 14, 22, 23, 24 |
| Snö | 15, 16, 17, 25, 26, 27 |

Rendera karaktären ovanpå/bredvid väderikonen: `character[precip_category][temp_band]`, valt utifrån vilken kod som är aktiv just nu + aktuell temperatur.

Praktiskt tips: generera alla bilder med **transparent bakgrund** (`isolated on transparent background, PNG`) så lagren går att stapla.

---

## 1. Basstil (klistra in i ALLA prompter för visuell konsekvens)

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, isolated on transparent
background, no text, children's book weather app icon style
```

Nattversion: lägg till `, dark navy blue night palette, tiny stars, crescent moon accents` istället för dagens ljusa palett.

---

## 2. Karaktären: "Vädergubben" (konsekvent figur, 25 kläd-varianter)

Basfigur som ska vara likadan i alla varianter (bara kläderna/tillståndet ändras):

```
a small round chubby cartoon person with a simple friendly face, big round eyes,
rosy cheeks, no visible hands (stubby round arms), standing pose, [BAS-STIL]
```

Prompt-tillägg = **[nederbörds-bas]** + **[temperatur-modifierare]** nedan, klistrat efter basfiguren.

### Matris: nederbördskategori × temperaturband

| | **Extremkallt** (< -20°C) | **Kallt** (-20 till 0°C) | **Milt** (0–15°C) | **Varmt** (15–25°C) | **Hett** (> 25°C) |
|---|---|---|---|---|---|
| **Torrt** | `dressed as a frozen eskimo, huge fur-lined parka hood, only eyes visible, icicles on eyebrows, breath frozen into an ice cloud, standing stiff like a popsicle` | `puffy winter coat, oversized knit hat with pom-pom sliding over eyes, huge scarf to the nose, mittens, bright red frozen nose, shivering with wavy motion lines` | `casual everyday jacket and jeans, relaxed neutral expression, hands in pockets` | `light t-shirt and shorts, sunglasses pushed up, relaxed happy pose, holding an ice cream cone` | `beachwear/swimsuit, sunglasses, lounging on a tiny beach chair, sipping a drink with a straw, melting ice cream dripping down the hand` |
| **Regn** | `thick raincoat pulled over bulky winter layers, holding an umbrella with icicles hanging off the edges, shivering underneath` | `raincoat over a winter jacket, rubber boots, holding an umbrella, looking both frozen and soggy` | `classic yellow raincoat, rubber boots, holding a small umbrella crookedly, one puddle by the feet, mildly grumpy` | `light see-through rain poncho, holding a small umbrella, cheerfully jumping in a puddle` | `beachwear with a tiny umbrella held up anyway, grinning and enjoying warm summer rain, steam rising off the pavement` |
| **Åska** | `hiding terrified under an umbrella, bundled in a thick winter coat, shivering from both cold and fear` | `winter jacket, hands clamped over ears, wide terrified eyes staring at the sky` | `raincoat, ducking with hands over head, terrified expression` | `t-shirt, flinching in fright, dropping an ice cream cone mid-air` | `beachwear, sprinting screaming toward a beach hut, towel flapping behind` |
| **Slask** | `frozen eskimo outfit soaked through with half-frozen slush, thoroughly miserable expression` | `winter jacket drenched with melting snow-and-rain mix, sour grumpy face, soggy mittens` | `raincoat and boots splattered with grey slush stains, extra grumpy expression` | `light jacket, irritably stepping around melting snow piles, rolling eyes` | `shorts, wading confused through oddly melting slush in the summer heat, puzzled expression` |
| **Snö** | `full eskimo outfit, fur hood, only the eyes visible, icicles in the eyelashes, standing frozen solid` | `classic winter coat, pom-pom hat, scarf, mittens, a small snowman standing next to them` | `lighter winter jacket and hat, cheerfully throwing a snowball` | `t-shirt, one single confused snowflake landing on the nose, puzzled look` | `beachwear, fanning themselves while a tiny snowman melts dramatically in the background` |
| **0 till 15°C** | `wearing a yellow raincoat and rubber boots, holding a tiny umbrella crookedly, slightly damp and grumpy expression, one puddle by the feet` | Sur men förberedd |
| **15 till 25°C** | `wearing a light t-shirt and shorts, relaxed happy pose, sunglasses pushed up on forehead, holding a small ice cream cone` | Nöjd normalläge |
| **> 25°C** | `sweating dramatically with big cartoon sweat drops, wearing a tank top, using a leaf as a fan, tongue slightly out, sunburned red cheeks, melting ice cream dripping down the hand` | Smälter i värmen |

---

## 3. Väderikoner per kod (bakgrundslager, dag + natt)

Formel: `[BAS-STIL] + [scenbeskrivning nedan] + (natt: mörk palett-tillägg)`

| Kod | Betydelse | Dag-prompt (scendel) | Natt-prompt (scendel) |
|---|---|---|---|
| 1 | Klart | `single bright smiling sun with sunglasses, winking` | `full moon wearing a nightcap, sleepy smile, one twinkling star` |
| 2 | Nästan klart | `smiling sun peeking shyly from behind one tiny cloud` | `crescent moon with one small cloud drifting lazily in front of its face` |
| 3 | Växlande molnighet | `sun and cloud playing peek-a-boo, sun looks slightly annoyed` | `moon and cloud taking turns covering each other, both giggling` |
| 4 | Halvklart | `sun half-covered by a fluffy cloud, sun making a "meh" face` | `moon half-hidden by a cloud, sleepy half-lidded eyes` |
| 5 | Molnigt | `two puffy clouds bumping into each other like bumper cars` | `two dark clouds gently bumping, tiny stars peeking between them` |
| 6 | Mulet | `one giant heavy gray cloud looking bored, arms crossed (cloud has stubby arms and a flat unimpressed face)` | `giant dark cloud with a flat sleepy face, snoring "Zzz" bubble` |
| 7 | Dimma | `a cloud confused and lost inside its own fog, comically squinting, tiny "?" above its head` | `a spooky-cute ghost-like fog cloud bumping softly into a lamppost, moon barely visible above` |
| 8 | Lätt regnskur | `small cloud sneezing out three light raindrops, "achoo" motion lines` | `small dark cloud sneezing a few raindrops, moon peeking through the mist` |
| 9 | Måttlig regnskur | `cloud shaking like a wet dog, medium raindrops flying off it` | `dark cloud shaking off raindrops, moon glinting off wet drops` |
| 10 | Kraftig regnskur | `cloud crying dramatically with a waterfall of tears/rain, exaggerated sad face` | `dark cloud crying a rain waterfall, single dramatic star shining through` |
| 11 | Åska | `cloud with sunglasses and a mohawk-shaped lightning bolt, striking a rockstar pose` | `dark cloud DJing with a lightning bolt as a microphone, disco-star sparkles` |
| 12 | Lätt slaskskur | `cloud looking confused, dripping a mix of a raindrop and a tiny snowflake melting together` | `dark cloud dripping a half-melted snowflake, moon looking equally confused` |
| 13 | Måttlig slaskskur | `cloud making a disgusted face while slushy grey drops splat below it` | `dark cloud grimacing, slushy drops falling under dim moonlight` |
| 14 | Kraftig slaskskur | `cloud wringing itself out like a wet towel, heavy slush pouring down` | `dark cloud wringing itself dry, heavy slush falling, moon hidden behind` |
| 15 | Lätt snöbyar | `cloud gently sprinkling three cute snowflakes like sugar on a cupcake` | `dark cloud sprinkling a few glittering snowflakes under the moon` |
| 16 | Måttliga snöbyar | `cloud happily shaking out a handful of snowflakes like confetti` | `dark cloud tossing snowflake confetti, moon wearing tiny earmuffs` |
| 17 | Kraftiga snöbyar | `cloud dumping a huge pile of snow like an overturned bucket, snowman already forming below` | `dark cloud dumping snow, a tiny snowman winking up at the moon` |
| 18 | Lätt regn | `cloud gently watering the ground like a watering can, small smile` | `dark cloud gently watering with a watering-can nozzle, calm moon above` |
| 19 | Måttligt regn | `cloud pouring rain steadily from a teapot spout shape` | `dark cloud pouring rain like a teapot, moon holding a tiny umbrella` |
| 20 | Kraftigt regn | `cloud as a fire hose blasting rain sideways, comically intense face` | `dark cloud blasting rain like a hose, moon ducking for cover behind it` |
| 21 | Åska (utan skurkaraktär) | `wide grumpy storm cloud crackling with multiple lightning bolts like static hair standing up` | `dark storm cloud with lightning bolt hair, moon wearing sunglasses ironically at night` |
| 22 | Lätt sleet | `cloud sneezing a single melting snowflake-raindrop hybrid` | `dark cloud sneezing softly, one slushy drop lit by moonlight` |
| 23 | Måttlig sleet | `cloud looking annoyed, alternating raindrops and snowflakes like it can't decide` | `dark cloud shrugging (can't decide rain or snow), moon shrugging too` |
| 24 | Kraftig sleet | `cloud overwhelmed, slush pouring down in a heavy indecisive mess` | `dark cloud overwhelmed by heavy slush, moon hiding behind a scarf of clouds` |
| 25 | Lätt snöfall | `cloud gently floating down single snowflakes like feathers from a pillow fight` | `dark cloud releasing glowing snowflakes that sparkle like tiny stars` |
| 26 | Måttligt snöfall | `cloud steadily pouring snow like flour from a bag, dusting everything below` | `dark cloud pouring snow like flour, moon getting lightly dusted too` |
| 27 | Kraftigt snöfall | `cloud in a full blizzard frenzy, snow flying everywhere, cloud's own face barely visible` | `dark cloud in blizzard mode, moon almost completely whited out by snow` |

---

## 4. Hur du kombinerar i appen

```
precip_category = mapCodeToCategory(code)     // se tabellen i avsnitt "Arkitektur"
temp_band       = mapTempToBand(temperature)
final_icon = layer(
  weather_background[code][day|night],
  character[precip_category][temp_band]
)
```

Exempel: kod 17 (kraftiga snöbyar), natt, -25°C →
`natt-bakgrund för kod 17` + `karaktär: snö × extremkallt (full eskimo-dräkt)`

Exempel: kod 19 (måttligt regn), dag, 28°C →
`dag-bakgrund för kod 19` + `karaktär: regn × hett (badkläder + paraply, ler i sommarregnet)`

Om du vill ha en enda sammansatt AI-genererad bild istället för lager (t.ex. för en hero-bild), kombinera helt enkelt scendelen + rätt cell ur matrisen + basstilen i en och samma prompt.

## 5. Filnamnskonvention (förslag)
```
weather_{kod}_{day|night}.png                  → t.ex. weather_17_night.png
character_{precip}_{band}.png                  → t.ex. character_snow_frozen.png
```
Nederbörds-nycklar: `dry`, `rain`, `thunder`, `sleet`, `snow`
Temperaturband-nycklar: `frozen` (<-20), `cold` (-20–0), `mild` (0–15), `warm` (15–25), `hot` (>25)
