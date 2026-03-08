import subprocess
import sys
import os

def record_script(url: str, output_file: str = "raw_recorded.py"):
    """
    Launches playwright codegen and saves the output to a file.
    """
    cmd = ["playwright", "codegen", "-o", output_file, url]
    
    print(f"Starting recording on {url}...")
    print(f"Output will be saved to {output_file}")
    
    try:
        subprocess.run(cmd, check=True)
        print("Recording completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error during recording: {e}")
    except FileNotFoundError:
        print("Playwright not found. Please install it with 'pip install playwright' and run 'playwright install'.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        url_input = input("Enter the URL to record: ")
    else:
        url_input = sys.argv[1]
        
    record_script(url_input)
