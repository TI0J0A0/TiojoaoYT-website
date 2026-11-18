"""Atualiza data/videos.json com os vídeos mais recentes do canal do YouTube.

Usa o RSS público do YouTube (grátis, sem chave de API).
Rodar na pasta do site:   python scripts/update_videos.py
"""
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

CHANNEL_ID = "UCpT-H-0kRTNbY6bQjK_hjJQ"  # TiojoaoYT
MAX_VIDEOS = 15  # o RSS do YouTube entrega no máximo 15
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "videos.json"

NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def main() -> None:
    req = urllib.request.Request(FEED, headers={"User-Agent": "Mozilla/5.0 (site-updater)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        root = ET.fromstring(resp.read())

    channel = root.findtext("a:title", default="", namespaces=NS)
    videos = []
    for entry in root.findall("a:entry", NS)[:MAX_VIDEOS]:
        vid = entry.findtext("yt:videoId", namespaces=NS)
        link = entry.find("a:link", NS).get("href")
        stats = entry.find("media:group/media:community/media:statistics", NS)
        videos.append({
            "id": vid,
            "titulo": entry.findtext("a:title", namespaces=NS),
            "url": link,
            "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "publicado": entry.findtext("a:published", namespaces=NS),
            "short": "/shorts/" in link,
            "views": int(stats.get("views")) if stats is not None else None,
            "canal": channel,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"canal": channel, "videos": videos}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(videos)} vídeos salvos em {OUT}")


if __name__ == "__main__":
    main()
