import requests

OWNER = "Zzzhenya"      # change this
REPO = "ft_transcnd"   # change this
BRANCH = "clean_branch"        # change this if your repo uses 'master' or another branch


API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}/git/trees/{BRANCH}?recursive=1"
RAW_BASE = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/"


response = requests.get(API_URL)
if response.status_code != 200:
    print("Error fetching repo tree:", response.json())
    exit(1)

data = response.json()

print("Files in repo with raw URLs:\n")
for item in data.get("tree", []):
    if item["type"] == "blob":  # only files
        # Skip files in legacy/ folder
        if not item["path"].startswith("legacy/") and not item["path"].startswith("frontend_jason/") and not item["path"].startswith("shared/") and not item["path"].startswith("script/") and not item["path"].startswith(".github/") and not item["path"].startswith("eval/"):
            raw_url = RAW_BASE + item["path"]
            print(raw_url)