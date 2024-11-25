const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();

// Basic express setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/coral-data', express.static('coral-data'));
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const coralId = req.body.coralId;
    const dir = path.join(process.cwd(), 'coral-data', coralId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Read coral data
function getCoralData() {
  const coralDir = path.join(process.cwd(), 'coral-data');
  let corals = [];

  try {
    if (fs.existsSync(coralDir)) {
      corals = fs.readdirSync(coralDir).map(folder => {
        const descPath = path.join(coralDir, folder, 'description.txt');
        const availPath = path.join(coralDir, folder, 'availability.txt');
        let description = 'No description available.';
        let availability = 'Unknown';
        
        try {
          description = fs.readFileSync(descPath, 'utf-8');
          if (fs.existsSync(availPath)) {
            availability = fs.readFileSync(availPath, 'utf-8').trim();
          }
        } catch (error) {
          console.error(`Error reading data for ${folder}:`, error);
        }

        const images = fs.readdirSync(path.join(coralDir, folder))
          .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
          .map(file => `/coral-data/${folder}/${file}`);

        return {
          id: folder,
          name: folder.replace(/-/g, ' '),
          description,
          availability,
          images
        };
      });
    }
  } catch (error) {
    console.error('Error reading coral data:', error);
  }

  return corals;
}

// Routes
app.get('/', (req, res) => {
  const corals = getCoralData();
  res.render('index', { corals });
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/coral/:id', (req, res) => {
  const corals = getCoralData();
  const coral = corals.find(c => c.id === req.params.id);
  if (coral) {
    res.render('coral', { coral });
  } else {
    res.status(404).send('Coral not found');
  }
});

app.get('/admin', (req, res) => {
  const corals = getCoralData();
  res.render('admin', { corals });
});

app.post('/upload', upload.array('images', 4), (req, res) => {
  try {
    const { coralId, description, availability } = req.body;
    const coralDir = path.join(process.cwd(), 'coral-data', coralId);
    
    fs.mkdirSync(coralDir, { recursive: true });
    fs.writeFileSync(path.join(coralDir, 'description.txt'), description);
    fs.writeFileSync(path.join(coralDir, 'availability.txt'), availability);
    
    res.redirect('/admin');
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send('Error processing upload');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Export for Vercel
module.exports = app;

// Start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Laura's Lagoon listening at http://localhost:${port}`);
  });
}