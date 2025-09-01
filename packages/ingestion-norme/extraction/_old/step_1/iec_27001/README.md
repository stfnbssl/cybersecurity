# ISO 27001/27002 Controls Extraction Output

- `iso_controls_27001_27002.json`: merged JSON per control (27001+27002)
- `iso_controls_27001_27002.csv`: flattened CSV
- `iso_controls.db`: SQLite with tables `standards`, `controls`, `control_texts`, `control_attributes`, `mappings`

## How it works
Extraction uses PyMuPDF text + regex to find control titles like `A.5.1 Title` and sections in 27002 (`Purpose`, `Guidance`, `Other information`).
Attributes like `Control type` and `Information security properties` are parsed when present.
