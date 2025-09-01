# Canvas di lavoro — Master Deck Servizi

> Usa questo canvas per: raccogliere input, definire la struttura del deck, e generare prompt
> riutilizzabili con cui produrre il **Master Deck** dei tuoi servizi.

---

## 0) Come usarlo (rapido)

1. Compila le sezioni 1–6 con le informazioni chiave.
2. Crea o rifinisci l'**Outline del deck** nella sezione 7.
3. Usa la **Prompt Library** (sez. 8) per far generare bozze, miglioramenti e controlli di qualità.
4. Quando pronto, usa il **Prompt finale** (sez. 9) con lo **DECK\_SPEC** per produrre il deck completo.
5. Itera con le checklist (sez. 10) e aggiorna la **Versione** (sez. 11).

---

## 1) Obiettivo e contesto

* **Obiettivo del deck**: {es. presentazione commerciale per prospect PMI}
* **Uso primario**: {live / invio via email / conferenza / webinar}
* **Lingua**: {IT / EN}
* **Call to Action desiderata**: {richiesta demo / preventivo / workshop}

## 2) Audience

* **Ruoli target**: {CEO, COO, CISO, IT Manager, OT Manager…}
* **Priorità e pain point**: {…}
* **Obiezioni tipiche**: {budget, tempi, compliance, lock-in…}
* **Livello tecnico**: {basso / medio / alto}

## 3) Portafoglio servizi (catalogo sintetico)

Per ogni servizio compila:

* **Nome servizio**: {…}
* **Problema risolto**: {…}
* **Benefici chiave**: {…}
* **Deliverable**: {…}
* **Evidenze/Proof**: {case, KPI, referenze}
* **Prerequisiti**: {…}
* **Tempi tipici**: {…}
* **Modello di prezzo**: {…}

*Ripeti per tutti i servizi.*

## 4) Messaggi chiave & Value Proposition

* **Value Proposition centrale (una frase)**: {…}
* **3 messaggi pilastro**:

  1. {…}
  2. {…}
  3. {…}
* **Tone of voice**: {istituzionale / consulenziale / energico / tecnico}
* **CTA esplicita**: {…}

## 5) Brand & Stile

* **Palette / Colori**: {…}
* **Font / Tipografia**: {…}
* **Stile visual**: {pittogrammi, foto reali, mockup, diagrammi}
* **Logo e asset**: link/note {…}
* **Linee di layout**: {aria, griglie, allineamenti}

## 6) Dati & Fonti

* **Statistiche / KPI** (con fonte):

  * {…}
* **Case study riassunti**:

  * Cliente {…} — problema {…} — risultato {…}
* **Riferimenti normativi**: {es. IEC 62443, NIS2…}

## 7) Outline del deck (bozza)

Suggerimento di struttura (adatta liberamente):

1. **Cover** — promessa di valore
2. **Agenda**
3. **Contesto & Problema**
4. **Approccio / Metodologia**
5. **Portafoglio Servizi (overview)**
6. **Servizio A** (1–2 slide)
7. **Servizio B** (1–2 slide)
8. **Evidenze / Case study**
9. **Roadmap di adozione**
10. **Modelli economici**
11. **Team & Credenziali**
12. **Prossimi passi / CTA**

> **Personalizza**: un deck per email richiede meno testo; uno per presentazione live può prevedere note speaker più ricche.

---

## 8) Prompt Library (copiabili e riusabili)

### 8.1 — Genera messaggi chiave

```
Agisci come strategist marketing B2B. Con i dati nelle sezioni 1–4,
proponi 1 value proposition e 3 messaggi pilastro concisi e non generici.
Mostra anche 3 possibili headline da cover. Fornisci solo output finale.
```

### 8.2 — Trasforma servizio → slide

```
Sei un presentation designer senior. Con il servizio seguente:
[INCOLLA QUI LA SCHEDA SERVIZIO DELLA SEZIONE 3]
Produci una slide con: Titolo forte, Sottotitolo di impatto,
3–5 bullet beneficio-orientati, 1 "prova" (dato, logo, breve esito),
Note speaker (max 80 parole) e un suggerimento visual.
Fornisci solo contenuto finale strutturato.
```

### 8.3 — Outline → scaletta dettagliata

```
Partendo dall'Outline (sez. 7), restituisci per ogni slide:
— Obiettivo, messaggio chiave, contenuti bullet, suggerimento visual, note speaker.
Evidenzia eventuali gap informativi da colmare.
```

### 8.4 — Coerenza & QA

```
Agisci come revisore critico. Verifica coerenza tra sezioni 1–6 e la bozza slide.
Elenca incongruenze, jargons, claim non supportati, rischi di lunghezza.
Per ogni punto, suggerisci una correzione specifica.
```

### 8.5 — Sintesi esecutiva (1 slide)

```
Crea una Executive Summary slide che riassuma value prop, 3 benefici,
1 caso d'uso e CTA. Output conciso e pronto per il deck.
```

### 8.6 — Adatta a canale (email vs live)

```
Prendi queste slide e produci due versioni: (A) per invio email (più testo,
meno dipendenza dalle note), (B) per presentazione live (bullet asciutti + note speaker).
```

### 8.7 — Localizzazione

```
Traduci/Adatta la bozza slide in [LINGUA], mantenendo tono e terminologia di settore.
```

---

## 9) DECK\_SPEC (JSON) + Prompt finale per generare il deck

### 9.1 — Schema (incolla/compila come JSON)

```json
{
  "meta": {
    "titolo": "{Master Deck Servizi}",
    "lingua": "it-IT",
    "brand": {"palette": [], "font": "", "stile": ""},
    "tono": "consulenziale",
    "cta": "{Richiedi una demo}"
  },
  "slides": [
    {
      "id": "s01",
      "tipo": "cover|agenda|problema|metodo|servizio|case|roadmap|prezzi|team|cta",
      "titolo": "",
      "obiettivo": "",
      "messaggio": "",
      "bullet": [""],
      "visual_suggerito": "",
      "dati": [{"label": "", "valore": "", "fonte": ""}],
      "note_speaker": ""
    }
  ]
}
```

### 9.2 — Prompt finale (usa dopo aver compilato lo schema)

```
Sei un presentation designer senior. Usa il seguente DECK_SPEC JSON per
produrre il contenuto completo del Master Deck in italiano. Per ogni slide,
fornisci: Titolo, Obiettivo, Messaggio chiave, 3–5 bullet, Dati (se presenti),
Suggerimento visual, Note speaker (≤ 80 parole). Mantieni il tono e la coerenza
brand indicati in meta. Mostra solo il contenuto finale; esplicita eventuali
assunzioni non coperte dai dati.

DECK_SPEC:
[INCOLLA QUI IL JSON]
```

---

## 10) Checklist qualità (segnare ✓)

* [ ] Ogni claim ha una fonte o una prova
* [ ] Lessico coerente con ruoli target
* [ ] CTA visibile nelle ultime 2 slide
* [ ] Versione email e versione live create
* [ ] Case study con risultato quantificabile
* [ ] Diagrammi comprensibili senza note
* [ ] Layout: margini e gerarchie titoli coerenti

## 11) Versioning

* **Versione**: v{…}
* **Data**: {AAAA-MM-GG}
* **Cambiamenti principali**: {…}

---

### Note libere

{Annotazioni, idee, parcheggio contenuti}
