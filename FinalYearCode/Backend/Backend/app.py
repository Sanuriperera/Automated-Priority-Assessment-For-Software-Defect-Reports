import re, os, pickle
import requests
import numpy as np
from pymongo import MongoClient
from flask import Flask, jsonify, request

import tensorflow as tf
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import RegexpTokenizer

############################## PARAMS / PATHS ###############################

host = '0.0.0.0'
port = 5000

model_weights = 'src/GRUmodel.h5'
tokenizer_path = 'src/tokenizer.pickle'

max_length = 20

class_dict = {
            'P1' : 0,
            'P2' : 1,
            'P3' : 2,
            'P4' : 3,
            'P5' : 4
                }

seed = 42
database = 'DefectAnalysis'
collection = 'Defects'
db_url = "mongodb+srv://admin:admin@early-detection.jevtz.mongodb.net/test"

##############################  LOAD WEIGHTS ####################################

with open(tokenizer_path, 'rb') as fp:
    tokenizer = pickle.load(fp)

model = tf.keras.models.load_model(model_weights)

############################ Helper Function ################################

# preprocess inputs
def preprocess_one(x):
    '''
        Text preprocess on term text using above functions
    '''
    stopwords_list = stopwords.words('english')
    lemmatizer = WordNetLemmatizer()
    tokenizer = RegexpTokenizer(r'\w+')
        
    try:
        x = x.lower()
        x = tokenizer.tokenize(x) # Remove puntuations & Tokenization
        x = [token for token in x if token not in stopwords_list]
        x = [re.sub('[0-9]', '', i) for i in x] # Remove Numbers
        x = [i for i in x if len(i)>0] # Remove empty strings
        x = [lemmatizer.lemmatize(k) for k in x] # Word Lemmatization
        x = ' '.join(x)
        
    except:
        x = ''
        
    x = x.strip()
    return x

# model inference
def inference(sample_text, tokenizer):
    text_processed = preprocess_one(sample_text)
    tokens = tokenizer.texts_to_sequences([text_processed]) # tokenize train data
    padded_tokens = tf.keras.preprocessing.sequence.pad_sequences(
                                                                tokens, 
                                                                maxlen=max_length, 
                                                                padding='pre', 
                                                                truncating='pre'
                                                                )
    
    P = model.predict(padded_tokens).squeeze()
    p = P.argmax() #get the probability value
    class_dict_rev = {v:k for k, v in class_dict.items()} #check probability value with priority class
    return class_dict_rev[p]

# function to return predicted results and save them to db
def get_prediction(defect_strings, db, db_write=False):
    '''
        Get prediction for each defect string
    '''
    predictions = []
    for defect_string in defect_strings:
        Pi = inference(defect_string, tokenizer)
        Pjson = {'Defect Report': defect_string, 'Priority Level': Pi}
        predictions.append(Pjson)
        if db_write:
            _ = db[collection].insert_one(Pjson)

    if not db_write:
        return predictions
                                                                                 
#################################################################################

app = Flask(__name__)

try:
    client = MongoClient(db_url, connect=False)
    db = client[database]
    client.server_info()
    print("Successfully Data Base Accessed !")

except Exception as e:
    print("#############################################################")
    print(e)
    print("#############################################################")

# function to upload csv file
@app.route("/defect_level", methods=["POST"])
def defect_level():
    try:
        csv_file = request.files['csv_file'].read()
        defect_strings = csv_file.decode('utf-8').split('\n')
        defect_strings = [defect_string.split('\r')[0] for defect_string in defect_strings if defect_string != ''][1:]

        predictions = get_prediction(defect_strings, db)
        response = {'predictions': "{}".format(predictions)}

    except:
        response = {'error': 'Invalid Request'}

    return jsonify(response)

# save predicted results to DB 
@app.route("/save2db", methods=["POST"])
def save2db():
    try:
        csv_file = request.files['csv_file'].read()
        defect_strings = csv_file.decode('utf-8').split('\n')
        defect_strings = [defect_string.split('\r')[0] for defect_string in defect_strings if defect_string != ''][1:]

        get_prediction(defect_strings, db, True)
        response = {'status': "succesfully uploaded data"}

    except:
        response = {'error': 'Invalid Request'}

    return jsonify(response)
    

if __name__ == "__main__": 
    app.run(
        debug=True, 
        host=host, 
        port= port, 
        threaded=False, 
        use_reloader=True
        )