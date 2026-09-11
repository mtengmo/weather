# Guide: splitta väderikon-sprite-sheets automatiskt

Det här är instruktioner för Claude Code (eller vem som helst som kör skriptet) för att gå från
de 19 genererade sprite-sheet-bilderna till enskilda, färdignamngivna, transparenta ikonfiler.

## Filer i det här paketet
- **`sheet-manifest.json`** — facit över varje sheet: vilken fil, vilket temperaturband, och vilka
  väder-typer kolumnerna motsvarar (i rätt ordning). Innehåller också SMHI-kodmappningen och
  fallback-regeln för de kombinationer som inte genererats (regn vid extremkyla, snö vid värme).
- **`split_icons.py`** — körbart Python-skript som läser manifestet, splittar varje sheet i sina
  celler, gör bakgrunden transparent, beskär tight till innehållet, och sparar varje ikon med
  korrekt filnamn (`weather_{typ}_{day|night}_{band}.png`).

## Steg för steg

1. **Lägg de 19 genererade PNG-bilderna i en mapp** (standard: `./sheets/`), med **exakt samma
   filnamn** som i manifestets `input_file`-fält, t.ex. `01_kvinna_frozen.png`,
   `07_par_nearzero.png`, osv. (Om bilderna sparats med andra namn — döp om dem, eller uppdatera
   `input_file` i manifestet.)

2. **Installera beroenden:**
   ```bash
   pip install pillow numpy scipy --break-system-packages
   ```

3. **Kör skriptet** från mappen där `sheet-manifest.json` ligger:
   ```bash
   python split_icons.py
   ```
   Valfria flaggor: `--sheets-dir <mapp>`, `--out-dir <mapp>`, `--manifest <path>`.

4. **Kontrollera outputen** i `./icons_split/`. Skriptet skriver ut en rad per ikon:
   - ✅ = sparad med bekräftad alfa-transparens
   - ⚠️ = sparad men saknar transparens-variation — öppna manuellt och kontrollera
   - ❌ = ingen bild kunde hittas i cellen (troligen fel antal kolumner i manifestet för den
     sheeten, eller att sheeten inte matchar förväntad layout — jämför mot orginal-prompten)

   Totalt förväntat antal: **124 ikoner** (summan av alla sheets kolumner × 2 rader).

## Hur splitten funkar (kort)

1. Bakgrunden görs transparent genom att bara ta bort den vita yta som är **sammanhängande med
   bildens fyra hörn** (flood fill) — så vita detaljer inne i själva karaktären (snö, andedräkt,
   isglitter) inte råkar bli genomskinliga av misstag.
2. Varje sheet delas i en grid utifrån antal kolumner (från manifestet) × 2 rader.
3. Varje cell krymps in ~4% från sina nominella kanter innan vi letar innehåll — ett skydd mot att
   marginalen mellan ikonerna är för tight (vilket hänt i tidigare genereringar) och att man därmed
   råkar fånga en bit av grannikonen.
4. Inom den inkrympta cellen hittas innehållets faktiska bounding box och bilden beskärs tight till
   den (+ 8px padding), så varje fil blir så liten och ren som möjligt.

## Om något går fel

- **Många ⚠️/❌ för en specifik sheet:** öppna den bilden manuellt — troligen sitter två ikoner
  ihop (för tight marginal i den genereringen) så att flood-fillen inte kan skilja dem åt. Generera
  om den sheeten med extra tydlig marginal-instruktion, eller höj `INSET_FRAC` i skriptet tillfälligt
  för just den filen.
- **Fel antal kolumner:** dubbelkolla mot manifestets `columns`-lista för just den filen — måste
  matcha exakt vad som beställdes i respektive promptfil (se `01_kvinna_frozen.txt` osv från
  tidigare i samtalet).
- **Fallback-koderna** (regn vid frozen/cold, snö vid mild/warm/hot) genereras aldrig av design —
  se `fallback`-nyckeln i manifestet för hur appen ska hantera dem i kod.
