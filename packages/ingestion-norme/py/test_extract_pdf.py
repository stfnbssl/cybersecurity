import fitz  # PyMuPDF
from typing import Tuple, Dict

def calculate_indent(x_position: float, base_margin: float = 50.0) -> str:
    """
    Calcola il rientro basandosi sulla posizione X.
    """
    if x_position <= base_margin:
        return ""
    
    indent_level = int((x_position - base_margin) / 20)
    return "  " * max(0, indent_level)

def load_pdf_with_indents_simple(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Versione semplice e affidabile che preserva i rientri usando get_text("blocks").
    """
    doc = fitz.open(path)
    pages = {}
    texts = []
    
    for page_num, page in enumerate(doc, 1):
        blocks = page.get_text("blocks")
        page_lines = []
        
        # Ordina i blocchi per posizione Y (dall'alto al basso)
        text_blocks = []
        for block in blocks:
            if len(block) >= 5 and block[4].strip():  # Ha testo
                text_blocks.append({
                    'x': block[0],
                    'y': block[1], 
                    'text': block[4].strip()
                })
        
        # Ordina per posizione Y
        text_blocks.sort(key=lambda b: b['y'])
        
        # Processa ogni blocco
        for block in text_blocks:
            block_lines = block['text'].split('\n')
            for line in block_lines:
                if line.strip():
                    indent = calculate_indent(block['x'])
                    page_lines.append(indent + line.strip())
        
        page_text = '\n'.join(page_lines)
        pages[page_num] = page_text
        texts.append(page_text)
    
    full_text = "\n".join(texts)
    return full_text, pages

def load_pdf_with_dict_method(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Usa get_text("dict") per maggiore controllo sui rientri.
    """
    doc = fitz.open(path)
    pages = {}
    texts = []
    
    for page_num, page in enumerate(doc, 1):
        text_dict = page.get_text("dict")
        page_lines = []
        
        for block in text_dict.get("blocks", []):
            if "lines" not in block:
                continue
                
            for line in block["lines"]:
                if not line.get("spans"):
                    continue
                    
                # Trova la posizione X minima della linea
                min_x = min(span["bbox"][0] for span in line["spans"])
                
                # Estrai tutto il testo della linea
                line_text = ""
                for span in line["spans"]:
                    line_text += span.get("text", "")
                
                if line_text.strip():
                    indent = calculate_indent(min_x)
                    page_lines.append(indent + line_text.strip())
        
        page_text = '\n'.join(page_lines)
        pages[page_num] = page_text
        texts.append(page_text)
    
    full_text = "\n".join(texts)
    return full_text, pages

def debug_pdf_structure(path: str):
    """
    Debug semplice per vedere la struttura del PDF.
    """
    doc = fitz.open(path)
    page = doc[0]
    
    print("=== ANALISI STRUTTURA PDF ===")
    
    # Metodo 1: blocks
    print("\n1. Analisi con get_text('blocks'):")
    blocks = page.get_text("blocks")
    print(f"   Numero blocchi: {len(blocks)}")
    for i, block in enumerate(blocks[:3]):  # Primi 3 blocchi
        if len(block) >= 5:
            print(f"   Blocco {i}: x={block[0]:.1f}, y={block[1]:.1f}")
            print(f"   Testo: {repr(block[4][:50])}")
    
    # Metodo 2: dict
    print("\n2. Analisi con get_text('dict'):")
    text_dict = page.get_text("dict")
    print(f"   Numero blocchi dict: {len(text_dict.get('blocks', []))}")
    
    text_blocks = [b for b in text_dict.get('blocks', []) if 'lines' in b]
    if text_blocks:
        first_block = text_blocks[0]
        print(f"   Prime linee del primo blocco:")
        for i, line in enumerate(first_block.get('lines', [])[:2]):
            if line.get('spans'):
                first_span = line['spans'][0]
                print(f"     Linea {i}: x={first_span['bbox'][0]:.1f}")
                print(f"     Testo: {repr(first_span.get('text', '')[:30])}")

def load_pdf_best_method(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Prova il metodo migliore automaticamente.
    """
    try:
        print("Tentativo con metodo 'dict'...")
        return load_pdf_with_dict_method(path)
    except Exception as e:
        print(f"Errore con metodo dict: {e}")
        print("Fallback al metodo 'blocks'...")
        return load_pdf_with_indents_simple(path)

# Esempio di utilizzo
if __name__ == "__main__":
    pdf_path = "C:/My/lb/documenti/NIST/NIST.SP.800-53r5.pdf"
    
    # Debug della struttura
    print("=== ANALISI STRUTTURA ===")
    debug_pdf_structure(pdf_path)
    
    # Estrazione con il metodo migliore
    print("\n=== ESTRAZIONE TESTO ===")
    text, pages = load_pdf_best_method(pdf_path)
    
    print("Prime 500 caratteri:")
    print(text[:500])
    print("\n" + "="*50)
    
    # Se vuoi vedere pagina per pagina
    for page_num, page_text in list(pages.items())[:2]:  # Prime 2 pagine
        print(f"\nPAGINA {page_num}:")
        print(page_text[:300])
        print("-" * 30)
