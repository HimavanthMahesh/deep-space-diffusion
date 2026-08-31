import unittest

from server import MAX_PROMPT_LENGTH, build_modal_url


class BuildModalUrlTests(unittest.TestCase):
    def test_encodes_prompt(self):
        url = build_modal_url(
            "black hole + accretion disk",
            "https://example.modal.run",
        )
        self.assertEqual(
            url,
            "https://example.modal.run?prompt=black%20hole%20%2B%20accretion%20disk",
        )

    def test_uses_default_prompt_for_blank_input(self):
        url = build_modal_url("   ", "https://example.modal.run")
        self.assertTrue(url.endswith("prompt=deep%20space%20nebula"))

    def test_rejects_missing_endpoint(self):
        with self.assertRaises(RuntimeError):
            build_modal_url("nebula", "")

    def test_rejects_excessive_prompt_length(self):
        with self.assertRaises(ValueError):
            build_modal_url("x" * (MAX_PROMPT_LENGTH + 1), "https://example.modal.run")


if __name__ == "__main__":
    unittest.main()
