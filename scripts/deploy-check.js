#!/usr/bin/env node

// Pre-deployment checks script
const fs = require('fs');
const path = require('path');

console.log('🚀 Running pre-deployment checks...\n');

const checks = [];

// Check 1: Environment variables
function checkEnvironmentVariables() {
    const requiredVars = [
        'MONGODB_URI',
        'BETTER_AUTH_SECRET',
        'BETTER_AUTH_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        return {
            name: 'Environment Variables',
            status: 'FAIL',
            message: `Missing required environment variables: ${missing.join(', ')}`
        };
    }

    return {
        name: 'Environment Variables',
        status: 'PASS',
        message: 'All required environment variables are set'
    };
}

// Check 2: Build artifacts
function checkBuildArtifacts() {
    const buildDir = path.join(process.cwd(), '.next');

    if (!fs.existsSync(buildDir)) {
        return {
            name: 'Build Artifacts',
            status: 'FAIL',
            message: 'Build directory not found. Run "npm run build" first.'
        };
    }

    return {
        name: 'Build Artifacts',
        status: 'PASS',
        message: 'Build artifacts found'
    };
}

// Check 3: Package.json scripts
function checkPackageScripts() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const requiredScripts = ['build', 'start', 'lint'];
    const missing = requiredScripts.filter(script => !packageJson.scripts[script]);

    if (missing.length > 0) {
        return {
            name: 'Package Scripts',
            status: 'FAIL',
            message: `Missing required scripts: ${missing.join(', ')}`
        };
    }

    return {
        name: 'Package Scripts',
        status: 'PASS',
        message: 'All required scripts are present'
    };
}

// Check 4: Security headers
function checkSecurityConfig() {
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');

    if (!fs.existsSync(nextConfigPath)) {
        return {
            name: 'Security Configuration',
            status: 'WARN',
            message: 'next.config.ts not found'
        };
    }

    const configContent = fs.readFileSync(nextConfigPath, 'utf8');

    if (!configContent.includes('headers')) {
        return {
            name: 'Security Configuration',
            status: 'WARN',
            message: 'Security headers not configured in next.config.ts'
        };
    }

    return {
        name: 'Security Configuration',
        status: 'PASS',
        message: 'Security headers configured'
    };
}

// Check 5: Database indexes
function checkDatabaseOptimization() {
    const optimizationPath = path.join(process.cwd(), 'lib/utils/database-optimization.ts');

    if (!fs.existsSync(optimizationPath)) {
        return {
            name: 'Database Optimization',
            status: 'FAIL',
            message: 'Database optimization utilities not found'
        };
    }

    return {
        name: 'Database Optimization',
        status: 'PASS',
        message: 'Database optimization utilities present'
    };
}

// Run all checks
async function runChecks() {
    checks.push(checkEnvironmentVariables());
    checks.push(checkBuildArtifacts());
    checks.push(checkPackageScripts());
    checks.push(checkSecurityConfig());
    checks.push(checkDatabaseOptimization());

    // Display results
    console.log('📋 Deployment Check Results:\n');

    let hasFailures = false;
    let hasWarnings = false;

    checks.forEach(check => {
        const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
        console.log(`${icon} ${check.name}: ${check.message}`);

        if (check.status === 'FAIL') hasFailures = true;
        if (check.status === 'WARN') hasWarnings = true;
    });

    console.log('\n' + '='.repeat(50));

    if (hasFailures) {
        console.log('❌ Deployment checks FAILED. Please fix the issues above.');
        process.exit(1);
    } else if (hasWarnings) {
        console.log('⚠️  Deployment checks passed with warnings. Review the warnings above.');
        process.exit(0);
    } else {
        console.log('✅ All deployment checks PASSED. Ready for deployment!');
        process.exit(0);
    }
}

// Run the checks
runChecks().catch(error => {
    console.error('Error running deployment checks:', error);
    process.exit(1);
});