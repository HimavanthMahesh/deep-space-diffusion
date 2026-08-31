import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMAGE_REFERENCE = re.compile(r"[\(\"']([^\)\"']+\.(?:png|jpg|jpeg|gif|webp))[\)\"']", re.I)


class StaticAssetTests(unittest.TestCase):
    def test_local_image_references_exist(self):
        missing = []
        for source_name in ("README.md", "index.html", "main.js", "styles.css"):
            source_path = ROOT / source_name
            for reference in IMAGE_REFERENCE.findall(
                source_path.read_text(encoding="utf-8")
            ):
                if reference.startswith(("http://", "https://", "data:")):
                    continue
                if not (ROOT / reference).is_file():
                    missing.append(f"{source_name}: {reference}")

        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
