# gen_project.py
# Single-file generator with content={...} and narrative parsing,
# FAISS TF-IDF index, denylist for hidden paths (.github, .git, etc.).

import os, re, sys, ast, faiss, pickle, argparse
from typing import List, Tuple, Dict, Any

# Conjunto de nombres reservados en Windows (no se pueden usar como nombre de archivo solo)
_WIN_RESERVED = {
    "CON","PRN","AUX","NUL",
    "COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
    "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
}

_INVALID_CHARS = r'<>:"|?*'  # inválidos en Win
_invalid_re = re.compile(r'[<>:"|?*]')

DENY_PREFIXES = (".git", ".github", ".svn", ".hg")

def is_hidden_segment(seg: str) -> bool:
    return seg.startswith(".")

def is_denied_path(rel: str) -> bool:
    r = rel.lstrip("./")
    for p in DENY_PREFIXES:
        if r == p or r.startswith(p + "/"):
            return True
    parts = r.split("/")
    return any(is_hidden_segment(s) for s in parts)

def rewrite_if_denied(rel: str, allow_hidden: bool) -> str:
    if allow_hidden:
        return rel
    r = rel.lstrip("./")
    if is_denied_path(r):
        return f"infra/{r}"
    return r

def sanitize_rel_path(path: str) -> Tuple[bool, str]:
    """
    Devuelve (ok, safe_path). Filtra rutas no seguras/absolutas y limpia caracteres inválidos.
    - Rechaza: absolutas, que contengan "..", empiecen con protocolo, 'Root:' u otra basura.
    - Normaliza separadores y quita leading './'.
    """
    if not path:
        return False, ""

    s = path.strip().replace("\\", "/")

    # Ignorar líneas que no son rutas de proyecto válidas
    if s.lower().startswith(("http://", "https://", "root:", "note:", "desc:", "description:")):
        return False, ""

    # Quitar viñetas/indentación común en árboles ("|--", "*", "-", etc.)
    s = re.sub(r'^\s*(\|[-\s]+|[*\-•]\s+)', "", s)

    # Quitar prefijos tipo "src/ - " o "-> "
    s = re.sub(r'^\s*(->|-\s+)\s*', "", s)

    # Asegurar relativo
    if os.path.isabs(s):
        return False, ""
    if s.startswith("./"):
        s = s[2:]

    # No permitir subir niveles
    if ".." in s.split("/"):
        return False, ""

    # Eliminar caracteres inválidos de cada segmento
    parts = []
    for seg in s.split("/"):
        seg = seg.strip()
        if not seg:
            continue
        seg = _invalid_re.sub("_", seg)
        if seg.upper() in _WIN_RESERVED and len(s.split("/")) == 1:
            # si el archivo fuera "CON", etc., renómbralo
            seg = f"_{seg}"
        parts.append(seg)

    if not parts:
        return False, ""
    safe = "/".join(parts)

    # Evitar sufijos extravagantes del árbol tipo " (file)" o ":" al final
    safe = safe.rstrip(":").strip()

    # Aún inválido si queda un colon en algún sitio
    if ":" in safe:
        return False, ""

    return True, safe

def _looks_like_tree_line(s: str) -> bool:
    has_tree_glyph = any(ch in s for ch in ["├", "└", "│"])
    is_bullet_dir = (s.startswith(("-", "•", "*")) and s.strip().endswith("/"))
    return has_tree_glyph or is_bullet_dir

def is_dir_line(line: str) -> bool:
    """Heurística: una 'carpeta' termina con '/' en el árbol."""
    return line.strip().endswith("/")

def ensure_dirs_from_tree(tree_text: str, out_dir: str, allow_hidden: bool = False):
    """
    Crea carpetas declaradas en el campo "tree". Ignora líneas que no sean rutas.
    """
    for raw in tree_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        ok, rel = sanitize_rel_path(line)
        if not ok:
            continue
        if not is_dir_line(rel):
            # Solo creamos directorios si la línea termina con '/'
            # (evita crear rutas a partir de archivos o líneas no carpetas)
            continue
        # Filtrar ocultos si no se permiten
        parts = rel.split("/")
        if not allow_hidden and any(p.startswith(".") for p in parts):
            continue
        target = os.path.join(out_dir, *parts)
        os.makedirs(target, exist_ok=True)


def slice_balanced_braces(s: str, start_idx: int) -> str:
    depth, i = 0, start_idx
    while i < len(s):
        ch = s[i]
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return s[start_idx:i+1]
        i += 1
    raise ValueError("No se encontró cierre de llaves balanceado.")

def coerce_dict_str(d: Dict[Any, Any]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for k, v in d.items(): out[str(k)] = v if isinstance(v, str) else str(v)
    out.setdefault("tree", "")
    return out

def extract_content_dict(text: str) -> Dict[str, str]:
    if text is None: raise ValueError("Texto vacío")
    raw = text.strip()
    m_str = re.search(r"content\\s*=\\s*(['\\\"]{1,3})(.*?)\\1\\s*\\Z", raw, flags=re.DOTALL)
    if m_str:
        only_text = m_str.group(2)
        return {"tree": "", "GENERATED.md": only_text if only_text else "# Empty content"}
    cleaned = re.sub(r"^```[a-zA-Z0-9_\\-]*\\s*", "", raw)
    cleaned = re.sub(r"\\s*```$", "", cleaned)
    m = re.search(r"content\\s*=\\s*{", cleaned)
    if m:
        try:
            dict_text = slice_balanced_braces(cleaned, cleaned.find("{", m.start()))
            obj = ast.literal_eval(dict_text)
            if isinstance(obj, dict): return coerce_dict_str(obj)
        except Exception: pass
    first = cleaned.find("{")
    if first != -1:
        try:
            dict_text = slice_balanced_braces(cleaned, first)
            obj = ast.literal_eval(dict_text)
            if isinstance(obj, dict): return coerce_dict_str(obj)
        except Exception: pass
    if re.search(r"\\bfrom\\b|\\bimport\\b|\\bdef\\b|\\bclass\\b", cleaned):
        return {"tree": "", "main.py": cleaned}
    return {"tree": "", "GENERATED.md": cleaned or "# Empty content"}

CODE_FENCE_RE = re.compile(r"```(?P<lang>[a-zA-Z0-9_\\-]*)\\s*\\n(?P<body>.*?)(?:```|$)", re.DOTALL)

def guess_filename(pre_lines: List[str], code_body: str, idx: int, allow_hidden: bool) -> Tuple[str, str]:
    body_lines = code_body.splitlines()
    if body_lines:
        m_first = re.match(r"^\\s*#\\s+([A-Za-z0-9_\\-./]+)$", body_lines[0].strip())
        if m_first:
            raw_path = m_first.group(1)
            try:
                rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
                return rel, "\\n".join(body_lines[1:]).lstrip("\\n")
            except Exception: pass
    for prev in reversed(pre_lines[-4:]):
        prev_clean = prev.strip()
        m_num = re.match(r"^\\d+\\)\\s+([A-Za-z0-9_\\-./]+)$", prev_clean)
        if m_num:
            raw_path = m_num.group(1)
            try:
                rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
                return rel, code_body
            except Exception: pass
        m_bullet = re.match(r"^[\\-\\*•]\\s+([A-Za-z0-9_\\-./]+)$", prev_clean)
        if m_bullet:
            raw_path = m_bullet.group(1)
            try:
                rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
                return rel, code_body
            except Exception: pass
        m_simple = re.match(r"^([A-Za-z0-9_.\\-\\/]+)$", prev_clean)
        if m_simple and ("/" in prev_clean or "." in prev_clean or prev_clean.lower().endswith("dockerfile")):
            raw_path = m_simple.group(1)
            try:
                rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
                return rel, code_body
            except Exception: pass
    return f"snippet_{idx}.txt", code_body

def extract_code_blocks_with_names(raw_text: str, allow_hidden: bool) -> Dict[str, str]:
    files: Dict[str, str] = {}
    for m in CODE_FENCE_RE.finditer(raw_text):
        body = m.group("body").rstrip()
        start_pos = m.start()
        prefix_lines = raw_text[:start_pos].splitlines()
        idx = len(files) + 1
        filename, code_text = guess_filename(prefix_lines, body, idx, allow_hidden=allow_hidden)
        code_text = code_text.replace("\\r\\n", "\\n")
        files[filename] = code_text
    return files

def create_project_from_content(content: Dict[str, str], base_path: str, overwrite: bool, dry_run: bool, allow_hidden: bool) -> Tuple[Dict[str, list], Dict[str, str]]:
    """
    Escribe archivos desde content = {"tree": "...", "path/file.ext": "code", ...}
    Devuelve (report, written_map).
    """
    os.makedirs(base_path, exist_ok=True)
    report = {"created": [], "overwritten": [], "skipped": []}
    written: Dict[str, str] = {}

    tree_text = content.get("tree") or content.get("TREE") or ""
    if tree_text:
        ensure_dirs_from_tree(tree_text, base_path, allow_hidden=allow_hidden)

    for k, code in content.items():
        if k.lower() == "tree":
            continue
        ok, rel = sanitize_rel_path(k)
        if not ok:
            report["skipped"].append(k)
            continue

        # Filtrar ocultos si no se permiten
        parts = rel.split("/")
        if not allow_hidden and any(p.startswith(".") for p in parts):
            report["skipped"].append(k)
            continue

        abs_path = os.path.join(base_path, *parts)
        folder = os.path.dirname(abs_path)
        os.makedirs(folder, exist_ok=True)

        if dry_run:
            report["skipped"].append(rel)
            continue

        if os.path.exists(abs_path):
            if overwrite:
                with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(code)
                report["overwritten"].append(rel)
                written[rel] = abs_path
            else:
                report["skipped"].append(rel)
        else:
            with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(code)
            report["created"].append(rel)
            written[rel] = abs_path

    return report, written


def build_project_from_text(text: str, out_dir: str="generated_project",
                            overwrite: bool=True, dry_run: bool=False, allow_hidden: bool=False):
    os.makedirs(out_dir, exist_ok=True)
    report = {"created": [], "overwritten": [], "skipped": []}
    written: Dict[str, str] = {}
    ensure_dirs_from_tree(text, out_dir, allow_hidden=allow_hidden)
    files = extract_code_blocks_with_names(text, allow_hidden=allow_hidden)
    if not files: files = {"GENERATED.md": text}
    for rel, content in files.items():
        try:
            rel_sane = sanitize_rel_path(rel, allow_hidden=allow_hidden)
        except Exception:
            rel_sane = sanitize_rel_path(f"snippets/{rel.replace('/', '_')}", allow_hidden=allow_hidden)
        abs_path = os.path.join(out_dir, rel_sane)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        if os.path.exists(abs_path) and not overwrite:
            report["skipped"].append(rel_sane); continue
        if dry_run:
            (report["overwritten"] if os.path.exists(abs_path) else report["created"]).append(rel_sane)
            written[rel_sane] = content; continue
        mode = "overwritten" if os.path.exists(abs_path) else "created"
        with open(abs_path, "w", encoding="utf-8", newline="\\n") as f: f.write(content)
        report[mode].append(rel_sane); written[rel_sane] = content
    return report, written

def build_faiss_index(files_map: Dict[str, str], index_dir: str, max_features: int = 4096) -> None:
    from sklearn.feature_extraction.text import TfidfVectorizer
    os.makedirs(index_dir, exist_ok=True)
    paths, texts = [], []
    for path, txt in files_map.items():
        paths.append(path); texts.append(f"{path}\\n{txt}")
    vec = TfidfVectorizer(max_features=max_features)
    X = vec.fit_transform(texts).toarray().astype("float32")
    faiss.normalize_L2(X)
    index = faiss.IndexFlatIP(X.shape[1]); index.add(X)
    faiss.write_index(index, os.path.join(index_dir, "index.faiss"))
    with open(os.path.join(index_dir, "meta.pkl"), "wb") as f: pickle.dump(paths, f)
    with open(os.path.join(index_dir, "vectorizer.pkl"), "wb") as f: pickle.dump(vec, f)

def search_faiss(query: str, index_dir: str, k: int = 5):
    from sklearn.feature_extraction.text import TfidfVectorizer
    index_path = os.path.join(index_dir, "index.faiss")
    meta_path = os.path.join(index_dir, "meta.pkl")
    vec_path = os.path.join(index_dir, "vectorizer.pkl")
    if not (os.path.exists(index_path) and os.path.exists(meta_path) and os.path.exists(vec_path)):
        raise FileNotFoundError("Índice FAISS incompleto.")
    index = faiss.read_index(index_path)
    with open(meta_path, "rb") as f: paths = pickle.load(f)
    with open(vec_path, "rb") as f: vec: TfidfVectorizer = pickle.load(f)
    q = vec.transform([query]).toarray().astype("float32"); faiss.normalize_L2(q)
    D, I = index.search(q, min(k, len(paths)))
    out = []
    for s, idx in zip(D[0], I[0]):
        if idx < 0: continue
        out.append((float(s), paths[idx]))
    return out

FORCE_FORMAT_SYSTEM = (
    "Always reply ONLY with a single valid Python assignment of the form:\\n"
    "content = {\\n"
    '  "tree": """<ASCII tree of the project>""",\\n'
    '  "<path/to/file.ext>": """<file content>""",\\n'
    '  "...": """..."""\\n'
    "}\\n"
    "- No extra text, no backticks, no explanations. Just the assignment."
)

def call_model_and_get_text(prompt: str, model_name: str = "gpt-5") -> str:
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except Exception as e:
        raise RuntimeError("Instala dependencias: pip install langchain-openai") from e
    llm = ChatOpenAI(model=model_name)
    msgs = [SystemMessage(content=FORCE_FORMAT_SYSTEM), HumanMessage(content=prompt or "Create a minimal skeleton.")]
    out = llm.invoke(msgs)
    return out.content

def auto_materialize(source_text: str, out_dir: str, overwrite: bool, dry_run: bool, allow_hidden: bool):
    try:
        content = extract_content_dict(source_text)
        return create_project_from_content(content, base_path=out_dir, overwrite=overwrite, dry_run=dry_run, allow_hidden=allow_hidden)
    except Exception:
        return build_project_from_text(source_text, out_dir=out_dir, overwrite=overwrite, dry_run=dry_run, allow_hidden=allow_hidden)
