require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI from .env
const uri = process.env.MONGO_URI;

// MongoDB Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const blogsCollection = client.db('mtsBlogDB').collection('blogs');
        const usersCollection = client.db('mtsBlogDB').collection('users');

        // Get all blogs
        app.get('/blogs', async (req, res) => {
            const result = await blogsCollection.find().toArray();
            res.send(result);
        });

        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogsCollection.findOne(query);
            res.send(result);
        });

        // Add blog
        app.post('/blogs', async (req, res) => {
            const newBlog = req.body;
            const result = await blogsCollection.insertOne(newBlog);
            res.send(result);
        });

        // Delete blog
        app.delete('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogsCollection.deleteOne(query);
            res.send(result);
        });

        // Update blog
        app.put('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: updatedData };

            try {
                const result = await blogsCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error("Failed to update blog:", error);
                res.status(500).json({ message: "Failed to update blog" });
            }
        });

        // Register user with hashed password
        app.post('/users', async (req, res) => {
            try {
                const { name, email, password } = req.body;

                // Check if user already exists (optional but recommended)
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ error: 'User already exists' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = {
                    name,
                    email,
                    password: hashedPassword
                };

                const result = await usersCollection.insertOne(newUser);
                res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Registration failed' });
            }
        });


        app.post('/login', async (req, res) => {
            const { email, password } = req.body;

            try {
                const user = await client.db('mtsBlogDB').collection('users').findOne({ email });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                if (user.password !== password) {
                    return res.status(401).json({ message: 'Incorrect password' });
                }

                res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
            } catch (err) {
                console.error('Login error:', err);
                res.status(500).json({ message: 'Login failed' });
            }
        });


        // Confirm MongoDB connection
        await client.db("admin").command({ ping: 1 });
        console.log(" Connected to MongoDB!");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
    res.send('Hello! This is MTS Blog Server');
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
