import os

directory = r"c:\Users\dawoo\Projects\GitHub\TheraAI-FYP-I\backend\app"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            if "datetime.utcnow()" in content:
                content = content.replace("datetime.utcnow()", "datetime.now(timezone.utc)")
                
                # Check for imports
                if "timezone" not in content:
                    if "from datetime import datetime" in content:
                        content = content.replace("from datetime import datetime", "from datetime import datetime, timezone", 1)
                    else:
                        content = "from datetime import timezone\n" + content
                
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {path}")
