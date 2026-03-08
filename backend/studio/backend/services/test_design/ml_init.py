import nltk
import spacy
import sys

def initialize_ml_dependencies():
    print("Checking ML dependencies...")
    
    # Download NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        print("Downloading NLTK punkt...")
        nltk.download('punkt')
        nltk.download('stopwords')
        nltk.download('averaged_perceptron_tagger')

    # Download spaCy model
    try:
        spacy.load("en_core_web_sm")
        print("spaCy model already present.")
    except Exception:
        print("Downloading spaCy en_core_web_sm...")
        import os
        os.system(f"{sys.executable} -m spacy download en_core_web_sm")

if __name__ == "__main__":
    initialize_ml_dependencies()
