const mongoose = require('mongoose');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Product Schema
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['stock', 'sellable', 'combination'], required: true },
    metric: { type: String, required: true },
    currentQuantity: { type: Number, required: true, default: 0 },
    minStockLevel: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function testCreateProduct() {
    await connectDB();

    try {
        // Find an existing product group
        const ProductGroup = mongoose.model('ProductGroup', new mongoose.Schema({ name: String }));
        const group = await ProductGroup.findOne();

        if (!group) {
            console.log('No product group found. Please create a product group first.');
            return;
        }

        console.log('Using group:', group.name, group._id);

        // Create a test product with prices
        const testProduct = new Product({
            name: 'Test Product with Prices',
            groupId: group._id,
            type: 'sellable',
            metric: 'pieces',
            currentQuantity: 100,
            minStockLevel: 10,
            costPrice: 50,
            sellingPrice: 100
        });

        const savedProduct = await testProduct.save();
        console.log('Product created successfully:', savedProduct.toObject());

        // Verify it was saved correctly
        const retrievedProduct = await Product.findById(savedProduct._id);
        console.log('Retrieved product:', retrievedProduct.toObject());

    } catch (error) {
        console.error('Error creating test product:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testCreateProduct();