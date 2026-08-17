from flask_frozen import Freezer
from docs.app import app

app.config['FREEZER_DESTINATION'] = '../website'

freezer = Freezer(app)

if __name__ == '__main__':
    freezer.freeze()
