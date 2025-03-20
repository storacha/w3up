import os
import sys
import json
import subprocess
import requests
import tempfile
import platform
from dotenv import load_dotenv

def run_command(command):
    try:
        result = subprocess.check_output(command, shell=True, text=True).strip()
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return None

def create_dag_and_car(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{file_path}' not found.")
        sys.exit(1)

    print(f"📂 Adding '{file_path}' to IPFS DAG...")
    car_file = f"{file_path}.car"

    if platform.system() == "Windows":
        ipfs_car_cmd = f"npx ipfs-car pack {file_path} --output {car_file}"
    else:
        ipfs_car_cmd = f"ipfs-car pack {file_path} --output {car_file}"

    try:
        ipfs_car_cmd_results = subprocess.run(
            ipfs_car_cmd, shell=True, check=True,
            stderr=subprocess.PIPE, stdout=subprocess.PIPE
        )
        ipfs_car_cmd_output = ipfs_car_cmd_results.stdout.decode("utf-8").strip()
        # Assume the last line is the CID
        cid = ipfs_car_cmd_output.split('\n')[-1]
        print(f"✅ CAR file created: {car_file}")
        print(f"✅ CID: {cid}")
        return cid, car_file
    except subprocess.CalledProcessError as e:
        print(f"❌ ipfs-car failed: {e.stderr.decode('utf-8')}")
        sys.exit(1)

def read_list_json():
    list_json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "list.json")
    if not os.path.exists(list_json_path):
        print("❌ Error: list.json file not found in the current directory.")
        sys.exit(1)
    
    with open(list_json_path, 'r') as f:
        payload = f.read()
    return payload

def upload_to_storacha(json_payload):
    """Upload to Storacha using the HTTP Bridge."""
    load_dotenv()
    
    auth_secret = os.getenv("X-AUTH-SECRET-HEADER")
    authorization = os.getenv("AUTHORIZATION-HEADER")
    endpoint = os.getenv("HTTPS-ENDPOINT", "https://up.storacha.network/bridge")
    
    if not auth_secret:
        raise ValueError("X-Auth-Secret is required in .env file as X-AUTH-SECRET-HEADER")
    if not authorization:
        raise ValueError("Authorization is required in .env file as AUTHORIZATION-HEADER")
    
    headers = {
        "X-AUTH-SECRET": auth_secret,
        "Authorization": authorization,
        "Content-Type": "application/json"
    }
    
    
    print(f"📤 Uploading to Storacha HTTP Bridge...")
    response = requests.post(
        endpoint,
        headers=headers,
        data=json_payload
    )
    
    if response.status_code == 200:
     print("✅ Upload successful!")
     return response.json()
    else:
     error_message = f"❌ Upload failed with status code {response.status_code}: {response.text}"
     print(error_message)
     raise requests.HTTPError(error_message)

def main():
    load_dotenv()
    
    if len(sys.argv) < 2:
        print("❌ Error: Please provide a file path to upload.")
        print("Usage: python storacha_uploader.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    space_did = os.getenv("SPACE_DID")
    if not space_did:
        print("❌ Error: SPACE_DID not found in .env file.")
        print("Please add SPACE_DID=your_space_did to your .env file.")
        sys.exit(1)
    
    print(f"🔑 Using Space DID: {space_did}")
    
    cid, car_file = create_dag_and_car(file_path)
    
    json_payload = read_list_json()
    
    result = upload_to_storacha(json_payload)
        
    if result:
        print(f"✅ File uploaded successfully to Storacha network.")
        print(f"✅ Access your file at: https://{cid}.ipfs.w3s.link")
        print(f"✅ Response details: {json.dumps(result, indent=2)}")
    else:
        print("❌ Upload failed.")

if __name__ == "__main__":
    main()
