"""Monta data.json a partir de um export do banco do Tabelando.
Uso: python3 tools/build_data.py <dir_export>
<dir_export> contém matches/*.json, standings/*.json, scorers/*.json, brackets/*.json e meta/status.json
(o formato que ArtifactData grava com out_dir). Escreve data.json na raiz do repositório."""
import json, glob, os, sys
D = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def coll(c):
    out = {}
    for f in sorted(glob.glob(os.path.join(D, c, "*.json"))):
        doc = json.load(open(f)); out[os.path.splitext(os.path.basename(f))[0]] = doc.get("data", doc) if isinstance(doc, dict) and set(doc) <= {"data", "version", "id"} else doc
    return out
matches = list(coll("matches").values())
meta = json.load(open(os.path.join(D, "meta", "status.json"))); meta = meta.get("data", meta); meta.pop("triggerId", None)
data = {"matches": matches, "tables": coll("standings"), "meta": meta, "scorers": coll("scorers"), "brackets": coll("brackets")}
assert matches and meta.get("updatedAt"), "export vazio — não sobrescrever data.json"
json.dump(data, open(os.path.join(root, "data.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("data.json:", len(matches), "jogos,", len(data["tables"]), "tabelas,", len(data["scorers"]), "artilharias,", len(data["brackets"]), "chaves · meta", meta.get("updatedAt"))
