import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

export default async function list() {
  const extensionsPath = path.join(process.cwd(), 'extensions');

  if (!fs.existsSync(extensionsPath)) {
    console.log('No extensions directory found');
    return;
  }

  const extensions = fs.readdirSync(extensionsPath);

  if (extensions.length === 0) {
    console.log('No extensions found');
    return;
  }

  const extensionList = [];
  extensions.forEach(ext => {
    const manifestPath = path.join(extensionsPath, ext, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      extensionList.push({
        name: `${manifest.name} (${manifest.id}) v${manifest.version}`,
        value: ext,
        path: path.join(extensionsPath, ext)
      });
    }
  });

  if (extensionList.length === 0) {
    console.log('No valid extensions found');
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select extensions to view details:',
      choices: extensionList
    }
  ]);

  if (answers.selected.length === 0) {
    console.log('\nNo extensions selected');
    return;
  }

  console.log('\nSelected Extensions:\n');
  answers.selected.forEach(ext => {
    const manifestPath = path.join(extensionsPath, ext, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📦 ${manifest.name} (${manifest.id})`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Description: ${manifest.description || 'No description'}`);
    console.log(`   Author: ${manifest.author || 'Unknown'}`);
    console.log(`   Path: ./extensions/${ext}\n`);
  });
}
