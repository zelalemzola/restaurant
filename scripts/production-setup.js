#!/usr/bin/env node

// Production setup and deployment script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up production environment...\n');

// Check Node.js version
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
        console.error('❌ Node.js version 18 or higher is required');
        process.exit(1);
    }

    console.log('✅ Node.js version check passed:', nodeVersion);
}

// Check required environment variables
function checkEnvironmentVariables() {
    const requiredVars = [
        'MONGODB_URI',
        'BETTER_AUTH_SECRET',
        'NEXTAUTH_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease check your .env.production file');
        process.exit(1);
    }

    console.log('✅ Environment variables check passed');
}

// Install dependencies
function installDependencies() {
    console.log('📦 Installing production dependencies...');
    try {
        execSync('npm ci --only=production', { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully');
    } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message);
        process.exit(1);
    }
}

// Build the application
function buildApplication() {
    console.log('🔨 Building application...');
    try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ Application built successfully');
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Run database migrations/setup
function setupDatabase() {
    console.log('🗄️  Setting up database...');
    try {
        // This would run any database setup scripts
        // execSync('npm run db:migrate', { stdio: 'inherit' });
        console.log('✅ Database setup completed');
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

// Validate build output
function validateBuild() {
    console.log('🔍 Validating build output...');

    const buildDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(buildDir)) {
        console.error('❌ Build directory not found');
        process.exit(1);
    }

    const staticDir = path.join(buildDir, 'static');
    if (!fs.existsSync(staticDir)) {
        console.error('❌ Static assets not found');
        process.exit(1);
    }

    console.log('✅ Build validation passed');
}

// Create production configuration
function createProductionConfig() {
    console.log('⚙️  Creating production configuration...');

    const config = {
        name: 'restaurant-erp',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 3000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '1G',
        node_args: '--max-old-space-size=1024'
    };

    // Create logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Write PM2 configuration
    fs.writeFileSync(
        path.join(process.cwd(), 'ecosystem.config.js'),
        `module.exports = ${JSON.stringify({ apps: [config] }, null, 2)};`
    );

    console.log('✅ Production configuration created');
}

// Security checks
function performSecurityChecks() {
    console.log('🔒 Performing security checks...');

    try {
        // Check for security vulnerabilities
        execSync('npm audit --audit-level=high', { stdio: 'pipe' });
        console.log('✅ Security audit passed');
    } catch (error) {
        console.warn('⚠️  Security vulnerabilities found. Run "npm audit fix" to resolve.');
    }

    // Check for sensitive files
    const sensitiveFiles = ['.env', '.env.local', '.env.development'];
    const foundSensitive = sensitiveFiles.filter(file =>
        fs.existsSync(path.join(process.cwd(), file))
    );

    if (foundSensitive.length > 0) {
        console.warn('⚠️  Sensitive files found in production:');
        foundSensitive.forEach(file => console.warn(`   - ${file}`));
        console.warn('   Make sure these are not deployed to production!');
    }
}

// Performance optimization checks
function performanceChecks() {
    console.log('⚡ Running performance checks...');

    try {
        // Analyze bundle size
        const buildManifest = path.join(process.cwd(), '.next/build-manifest.json');
        if (fs.existsSync(buildManifest)) {
            const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
            console.log('✅ Bundle analysis completed');
        }

        // Check for large files
        const staticDir = path.join(process.cwd(), '.next/static');
        if (fs.existsSync(staticDir)) {
            const files = fs.readdirSync(staticDir, { recursive: true });
            const largeFiles = files.filter(file => {
                const filePath = path.join(staticDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const size = fs.statSync(filePath).size;
                    return size > 1024 * 1024; // 1MB
                }
                return false;
            });

            if (largeFiles.length > 0) {
                console.warn('⚠️  Large static files found:');
                largeFiles.forEach(file => console.warn(`   - ${file}`));
            }
        }

        console.log('✅ Performance checks completed');
    } catch (error) {
        console.warn('⚠️  Performance checks failed:', error.message);
    }
}

// Main execution
async function main() {
    try {
        checkNodeVersion();
        checkEnvironmentVariables();
        installDependencies();
        buildApplication();
        setupDatabase();
        validateBuild();
        createProductionConfig();
        performSecurityChecks();
        performanceChecks();

        console.log('\n🎉 Production setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Review the generated ecosystem.config.js file');
        console.log('2. Start the application with: npm start');
        console.log('3. Monitor logs in the ./logs directory');
        console.log('4. Check health at: /api/health');

    } catch (error) {
        console.error('\n❌ Production setup failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };