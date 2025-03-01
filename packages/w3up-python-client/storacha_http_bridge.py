"""import os
import subprocess
import requests
import tempfile
import platform
from dotenv import load_dotenv

load_dotenv()
space_name = os.getenv("SPACE_NAME")
file_path = os.getenv("FILE_PATH")
https_endpoint = os.getenv("HTTPS_ENDPOINT", "https://up.storacha.network/bridge")

class StorachaClient:
    def __init__(self, https_endpoint="https://up.storacha.network/bridge"):
        self.https_endpoint = https_endpoint
        self.tokens = {}
        self.spaces = {}

    def run_command(self, command):
        try:
            result = subprocess.check_output(command, shell=True, text=True).strip()
            return result
        except subprocess.CalledProcessError as e:
            print(f"❌ Error: {e.stderr}")
            return None

    def space_ls(self):
        if platform.system() == "Windows":
            space_ls_cmd = "npx w3 space ls"
        else:
            space_ls_cmd = "w3 space ls"
        spaces = {}
        try:
            results = subprocess.check_output(space_ls_cmd, shell=True)
            results = results.decode("utf-8").strip()
            results = results.split("\n")
            results = [i.replace("\n", "").replace("* ", "") for i in results]
            spaces = [i.split(" ") for i in results]
            spaces = {i[1]: i[0] for i in spaces}
            self.spaces = spaces
        except subprocess.CalledProcessError as e:
            print("space_ls failed")
            import traceback
            error = e
            error += traceback.format_exc()
            print(error)
            return ValueError(error)

        return spaces

    def generate_tokens(self, space, permissions=None):
        if permissions is None:
            permissions = ["--can upload/add", "--can store/add"]
        command = f"w3 bridge generate-tokens {space} " + " ".join(permissions)
        result = self.run_command(command)
        if result:
            lines = result.split('\n')
            auth_secret = lines[0].split(': ')[1]
            authorization = lines[1].split(': ')[1]
            self.tokens[space] = {
                "X-Auth-Secret header": auth_secret,
                "Authorization header": authorization
            }
            return self.tokens[space]
        return None

    def upload_add_https(self, space, file, file_root, shards=None):
        if space not in self.tokens:
            print(f"❌ Error: No tokens found for space '{space}'.")
            return None

        auth_secret = self.tokens[space]["X-Auth-Secret header"]
        authorization = self.tokens[space]["Authorization header"]
        method = "upload/add"

        with tempfile.NamedTemporaryFile(suffix=".car", delete=False) as temp:
            car_filename = temp.name
            if platform.system() == "Windows":
                ipfs_car_cmd = f"npx ipfs-car pack {file} --output {car_filename}"
            else:
                ipfs_car_cmd = f"ipfs-car pack {file} --output {car_filename}"

            try:
                ipfs_car_cmd_results = subprocess.run(
                    ipfs_car_cmd, shell=True, check=True,
                    stderr=subprocess.PIPE, stdout=subprocess.PIPE
                )
                ipfs_car_cmd_output = ipfs_car_cmd_results.stdout.decode("utf-8").strip()
                cid = ipfs_car_cmd_output.split('\n')[-1]
            except subprocess.CalledProcessError as e:
                print(f"❌ ipfs-car failed: {e.stderr.decode('utf-8')}")
                return None

        filename = file.replace(file_root, "").replace("\\", "/")

        if cid:
            data = {
                "tasks": [
                    [
                        "upload/add",
                        space,
                        {
                            "root": {"/": cid},
                            "shards": shards or []
                        }
                    ]
                ]
            }

            headers = {
                "X-Auth-Secret": auth_secret,
                "Authorization": authorization,
                "Content-Type": "application/json"
            }

            with open(car_filename, 'rb') as car_file:
                response = requests.post(
                    self.https_endpoint,
                    headers=headers,
                    data=car_file
                )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Upload failed with status code {response.status_code}: {response.text}")
                return None
        else:
            print("❌ Error: CID not generated.")
            return None

if __name__ == "__main__":
    storacha = StorachaClient()

    # List existing spaces
    spaces = storacha.space_ls()
    if not spaces:
        print("❌ No spaces found.")
        exit(1)

    # Generate tokens for the space
    space_did = list(spaces.keys())[0]  # Selecting the first available space
    tokens = storacha.generate_tokens(space_did)
    if not tokens:
        print("❌ Failed to generate tokens.")
        exit(1)

    # Upload file using upload_add_https
    result = storacha.upload_add_https(space_did, file_path, os.path.dirname(file_path))
    if result:
        print(f"✅ Successfully uploaded file to space. Details: {result}")
    else:
        print("❌ Failed to upload file to space")
"""