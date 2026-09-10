# DALL·E-tillägg: vad som saknades och en förbättrad prompt

Den befintliga guiden (`vaderikoner-promptguide.md`) beskriver rätt lager-arkitektur och en bra
klädmatris, men saknar flera saker som spelar roll specifikt när man genererar 25 separata bilder
med DALL·E/ChatGPT (gpt-image-1) och förväntar sig att de ska gå att stapla och skala likadant i
en app:

## Vad som saknades

1. **Ingen konsekvens-strategi mellan separata genereringar.** DALL·E/gpt-image-1 garanterar inte
   att samma "person" återskapas identiskt från en ny textprompt varje gång — ansikte, proportioner
   och färgton kan drifta mellan de 25 bilderna även med identisk bas-beskrivning. Guiden saknade
   ett recept för att låsa fast utseendet.
2. **Ingen canvas-/beskärningsspecifikation.** Utan en fast duk-storlek och en regel för hur stor
   andel av bilden karaktären ska fylla blir bilderna olika stora/placerade och kräver manuell
   justering per bild innan de kan läggas ovanpå väderikonen konsekvent.
3. **Ingen "floating"-regel.** Utan att uttryckligen be om ingen skugga/marklinje riskerar några
   bilder få en golv-yta eller kastad skugga som ser fel ut när karaktären läggs bredvid en ikon som
   själv svävar fritt.
4. **Ingen varning för prompt-omskrivning.** ChatGPT skriver ofta om/utsmyckar prompten internt
   innan bilden genereras, vilket kan smyga in detaljer (bakgrundselement, extra rekvisita) som inte
   fanns i originaltexten. Guiden nämnde inte hur man minimerar det.
5. **Ingen not om verklig alfa-transparens.** Frasen "isolated on transparent background" i prompten
   är nödvändig men inte tillräcklig — ChatGPT:s bildgenerering (gpt-image-1) stödjer transparent
   bakgrund som en explicit inställning (inte bara textinstruktion), och även då bör resultatet
   verifieras (kolla alfa-kanalen) innan det committas som asset, annars kan man få en vit/rutig
   bakgrund istället för verklig transparens.

## Rekommenderat arbetsflöde (inte bara en prompt)

1. **Generera en "referensbild"/modellark först** — en enda bild av basfiguren i sin mest neutrala
   variant (torrt, milt temperaturband), med hela bas-prompten nedan.
2. **Återanvänd samma bild-tråd/konversation** för alla 25 varianter, och be varje gång: *"Same
   character as the reference image above — identical face, proportions, and skin/color tone. Only
   change: [klädbeskrivning från matrisen]."* Att referera tillbaka till en redan godkänd bild inom
   samma konversation (eller ladda upp den bilden som bifogad referens) ger betydligt bättre
   konsekvens än att beskriva karaktären från noll 25 gånger.
3. **Verifiera transparens** på varje exporterad PNG (öppna i ett verktyg som visar alfa-kanalen,
   t.ex. Photoshop/GIMP eller `python -c "from PIL import Image; print(Image.open('x.png').mode)"`
   — förvänta `RGBA` med faktiskt varierande alfa, inte bara `RGB` på vit botten).

## Förbättrad bas-prompt att använda

Lägg till detta i **basstilen** (klistras in i varje prompt, före klädbeskrivningen):

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, no text, no watermark,
no signature, children's book weather app icon style.

Character: a small round chubby cartoon person with a simple friendly face,
big round eyes, rosy cheeks, no visible hands (stubby round arms), standing
pose, facing forward, centered in frame.

Canvas: square image, character fills approximately 70% of the frame height,
generous empty margin on all sides, no cropping of the character.

Background: fully transparent (alpha channel), absolutely no ground line,
floor, shadow, platform, or background scenery of any kind — the character
must appear to float freely so it can be composited next to a separate icon.

Consistency: this must be the exact same character as shown in the reference
image (same face, proportions, skin tone, color palette) — do not
reinterpret or redesign the character; only change the clothing/pose
described below.
```

Sedan följer klädbeskrivningen från befintliga matrisen (`vaderikoner-promptguide.md`, avsnitt 2)
oförändrad.

### Exempel, komplett prompt (Regn × Milt, 0–15°C)

```
flat vector cartoon illustration, thick clean outlines, playful and humorous,
soft rounded shapes, limited pastel color palette, no text, no watermark,
no signature, children's book weather app icon style.

Character: a small round chubby cartoon person with a simple friendly face,
big round eyes, rosy cheeks, no visible hands (stubby round arms), standing
pose, facing forward, centered in frame.

Canvas: square image, character fills approximately 70% of the frame height,
generous empty margin on all sides, no cropping of the character.

Background: fully transparent (alpha channel), absolutely no ground line,
floor, shadow, platform, or background scenery of any kind — the character
must appear to float freely so it can be composited next to a separate icon.

Consistency: this must be the exact same character as shown in the reference
image (same face, proportions, skin tone, color palette) — do not
reinterpret or redesign the character; only change the clothing/pose
described below.

Clothing: classic yellow raincoat, rubber boots, holding a small umbrella
crookedly, one puddle by the feet, mildly grumpy expression.
```

## Filnamnskonvention (oförändrad, men explicit här)

```
character_{precip}_{band}.png
```
`precip`: `dry`, `rain`, `thunder`, `sleet`, `snow`
`band`: `frozen` (<-20°C), `cold` (-20–0°C), `mild` (0–15°C), `warm` (15–25°C), `hot` (>25°C)

25 filer totalt — samma 5×5-matris som redan finns i `vaderikoner-promptguide.md`.
