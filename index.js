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

        // Get blog by id
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            // Validation missing here: check if id is a valid ObjectId!
            const query = { _id: new ObjectId(id) };
            const result = await blogsCollection.findOne(query);
            if (!result) return res.status(404).send({ message: 'Blog not found' });
            res.send(result);
        });

        // Add blog
        app.post('/blogs', async (req, res) => {
            const newBlog = req.body;
            // You might want to validate `newBlog` content here before inserting
            const result = await blogsCollection.insertOne(newBlog);
            res.status(201).send(result);
        });

        // Delete blog
        app.delete('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            // Validation missing here too
            const query = { _id: new ObjectId(id) };
            const result = await blogsCollection.deleteOne(query);
            if (result.deletedCount === 0) return res.status(404).send({ message: 'Blog not found' });
            res.send({ message: 'Blog deleted' });
        });

        // Update blog
        app.put('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            // Validation missing for id and updatedData structure
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: updatedData };

            try {
                const result = await blogsCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) return res.status(404).send({ message: 'Blog not found' });
                res.send(result);
            } catch (error) {
                console.error("Failed to update blog:", error);
                res.status(500).json({ message: "Failed to update blog" });
            }
        });

        // Register user with hashed password
        app.post('/users', async (req, res) => {
            try {
                const { name, email, password, role } = req.body;

                if (!name || !email || !password) {
                    return res.status(400).json({ error: 'Name, email and password are required' });
                }

                // Check if user already exists
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ error: 'User already exists' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = {
                    name,
                    email,
                    password: hashedPassword,
                    role: role
                };

                const result = await usersCollection.insertOne(newUser);
                res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Registration failed' });
            }
        });

        // Login user
        app.post('/login', async (req, res) => {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            try {
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Incorrect password' });
                }

                res.json({
                    message: 'Login successful',
                    user: {
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                });
            } catch (err) {
                console.error('Login error:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });


        // Get all users
        app.get('/users', async (req, res) => {
            try {
                const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
                res.send(users);
            } catch (err) {
                res.status(500).json({ message: 'Failed to fetch users' });
            }
        });

        // Update user role
        app.put('/users/:id/role', async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;

            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }

            try {
                const filter = { _id: new ObjectId(id) };
                const updateDoc = { $set: { role } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ message: 'User not found or role not changed' });
                }
                res.json({ message: 'User role updated' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Failed to update role' });
            }
        });



        // Confirm MongoDB connection
        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB!");
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
