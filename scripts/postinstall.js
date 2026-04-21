const fs = require('node:fs');
const path = require('node:path');

const sharpWasmPackagePaths = [
	// Nested layout: node_modules/n8n-nodes-copilot-agent/node_modules/@github/...
	path.join(
		__dirname,
		'..',
		'node_modules',
		'@github',
		'copilot',
		'sharp',
		'node_modules',
		'@img',
		'sharp-wasm32',
	),
	// Hoisted layout: node_modules/@github/... (common in npm install --prefix)
	path.join(
		__dirname,
		'..',
		'..',
		'@github',
		'copilot',
		'sharp',
		'node_modules',
		'@img',
		'sharp-wasm32',
	),
];

const n8nDevCommandPath = path.join(
	__dirname,
	'..',
	'node_modules',
	'@n8n',
	'node-cli',
	'dist',
	'commands',
	'dev',
	'index.js',
);

const pinnedN8nVersion = '2.15.0';
const pinnedN8nArgs = `args: ['-y', '--color=always', '--prefer-online', 'n8n@${pinnedN8nVersion}'],`;
const n8nArgsPattern = /args:\s*\['-y', '--color=always', '--prefer-online', 'n8n@[^']+'\],/;

let removedSharpWasm = false;

for (const sharpWasmPackagePath of sharpWasmPackagePaths) {
	if (!fs.existsSync(sharpWasmPackagePath)) {
		continue;
	}

	fs.rmSync(sharpWasmPackagePath, { recursive: true, force: true });
	removedSharpWasm = true;
	console.log(`Removed ${sharpWasmPackagePath} to avoid n8n loading nested *.node.js files as community nodes.`);
}

if (!removedSharpWasm) {
	console.log('No sharp-wasm32 package path found to remove.');
}

if (!fs.existsSync(n8nDevCommandPath)) {
	console.warn(`Skipped n8n version pin because ${n8nDevCommandPath} was not found.`);
	process.exit(0);
}

const n8nDevCommandContents = fs.readFileSync(n8nDevCommandPath, 'utf8');

if (n8nDevCommandContents.includes(pinnedN8nArgs)) {
	console.log(`n8n dev server is already pinned to n8n@${pinnedN8nVersion}.`);
	process.exit(0);
}

if (!n8nArgsPattern.test(n8nDevCommandContents)) {
	console.warn(`Skipped n8n version pin because the expected args line was not found in ${n8nDevCommandPath}.`);
	process.exit(0);
}

fs.writeFileSync(
	n8nDevCommandPath,
	n8nDevCommandContents.replace(n8nArgsPattern, pinnedN8nArgs),
);

console.log(`Pinned @n8n/node-cli dev server to n8n@${pinnedN8nVersion} in ${n8nDevCommandPath}.`);