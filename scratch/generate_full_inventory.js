const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'src/EduVault.Web/src');
const apiDir = path.join(rootDir, 'src/EduVault.Api/Controllers');
const expressFile = path.join(rootDir, 'src/EduVault.Express/server.js');
const entitiesDir = path.join(rootDir, 'src/EduVault.Core/Entities');

function getAllFiles(dir, exts = ['.jsx', '.js', '.cs']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

// 1. Scan Frontend Pages and Routes
const webFiles = getAllFiles(webDir, ['.jsx', '.js']);
let routes = new Set();
let pages = new Set();
let buttonCount = 0;
let formCount = 0;
let inputCount = 0;
let selectDropdownCount = 0;
let checkboxCount = 0;
let radioCount = 0;
let modalCount = 0;
let tableCount = 0;
let searchControlCount = 0;
let filterCount = 0;
let paginationCount = 0;
let linkCount = 0;

for (const file of webFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(webDir, file);

  if (relPath.startsWith('pages') || relPath.startsWith('components')) {
    pages.add(relPath);
  }

  // Routes
  const routeMatches = content.matchAll(/path=["']([^"']+)["']/g);
  for (const m of routeMatches) {
    routes.add(m[1]);
  }

  // Buttons
  const buttons = content.match(/<button\b|<Button\b/gi) || [];
  buttonCount += buttons.length;

  // Forms
  const forms = content.match(/<form\b/gi) || [];
  formCount += forms.length;

  // Inputs
  const inputs = content.match(/<input\b|<Input\b/gi) || [];
  inputCount += inputs.length;

  // Dropdowns / Selects
  const selects = content.match(/<select\b|<Select\b/gi) || [];
  selectDropdownCount += selects.length;

  // Checkboxes
  const checkboxes = content.match(/type=["']checkbox["']/gi) || [];
  checkboxCount += checkboxes.length;

  // Radio
  const radios = content.match(/type=["']radio["']/gi) || [];
  radioCount += radios.length;

  // Modals
  const modals = content.match(/<Modal\b|isOpen=|showModal/gi) || [];
  modalCount += modals.length;

  // Tables
  const tables = content.match(/<table\b|<Table\b/gi) || [];
  tableCount += tables.length;

  // Search
  const searches = content.match(/placeholder=["'][^"']*search[^"']*["']|handleSearch|searchQuery/gi) || [];
  searchControlCount += searches.length;

  // Filters
  const filters = content.match(/filter|selectedCategory|selectedStatus/gi) || [];
  filterCount += filters.length;

  // Pagination
  const paginations = content.match(/pagination|currentPage|totalPages|nextPage/gi) || [];
  paginationCount += paginations.length;

  // Links
  const links = content.match(/<a\b|<Link\b|<NavLink\b/gi) || [];
  linkCount += links.length;
}

// 2. Scan Backend APIs
const apiFiles = getAllFiles(apiDir, ['.cs']);
let endpoints = [];

for (const file of apiFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const controllerName = path.basename(file, '.cs');
  
  // Find Route prefix
  const routePrefixMatch = content.match(/\[Route\(["']([^"']+)["']\)\]/);
  const prefix = routePrefixMatch ? routePrefixMatch[1] : 'api';

  // Find methods
  const methodRegex = /\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(?:\(["']?([^"']*)["']?\))?\]/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const httpVerb = match[1].replace('Http', '').toUpperCase();
    const subPath = match[2] || '';
    const fullPath = `/${prefix}${subPath ? '/' + subPath : ''}`.replace(/\/+/g, '/');
    endpoints.push({ verb: httpVerb, path: fullPath, controller: controllerName, type: '.NET' });
  }
}

// Express endpoints
if (fs.existsSync(expressFile)) {
  const content = fs.readFileSync(expressFile, 'utf-8');
  const expressRegex = /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  let match;
  while ((match = expressRegex.exec(content)) !== null) {
    endpoints.push({ verb: match[1].toUpperCase(), path: match[2], controller: 'Express Auxiliary', type: 'Node/Express' });
  }
}

// 3. Scan Database Entities
const entityFiles = getAllFiles(entitiesDir, ['.cs']);
let entities = entityFiles.map(f => path.basename(f, '.cs'));

const inventory = {
  totalModules: 7, // SuperAdmin, SchoolAdmin, Teacher, AccountManager, Librarian, Receptionist, Student
  totalSubmodules: 24,
  totalPages: pages.size,
  totalRoutes: routes.size,
  totalButtons: buttonCount,
  totalLinks: linkCount,
  totalForms: formCount,
  totalInputFields: inputCount,
  totalDropdowns: selectDropdownCount,
  totalCheckboxes: checkboxCount,
  totalRadioButtons: radioCount,
  totalModals: modalCount,
  totalTables: tableCount,
  totalSearchControls: searchControlCount,
  totalFilters: filterCount,
  totalPaginationControls: paginationCount,
  totalApiEndpoints: endpoints.length,
  totalDatabaseEntities: entities.length,
  totalUserRoles: 7,
  roles: ['superadmin', 'schooladmin', 'teacher', 'accountmanager', 'librarian', 'receptionist', 'student'],
  endpoints: endpoints,
  entities: entities
};

fs.writeFileSync(path.resolve(__dirname, 'application_inventory.json'), JSON.stringify(inventory, null, 2));
console.log("=========================================================================");
console.log("📊 EDUVAULT COMPLETE APPLICATION INVENTORY BASELINE");
console.log("=========================================================================");
console.log(`Total Roles:                  ${inventory.totalUserRoles}`);
console.log(`Total Modules:                ${inventory.totalModules}`);
console.log(`Total Submodules:             ${inventory.totalSubmodules}`);
console.log(`Total Component/Page Files:   ${inventory.totalPages}`);
console.log(`Total Discovered UI Routes:   ${inventory.totalRoutes}`);
console.log(`Total Buttons:                ${inventory.totalButtons}`);
console.log(`Total Links:                  ${inventory.totalLinks}`);
console.log(`Total Forms:                  ${inventory.totalForms}`);
console.log(`Total Input Fields:           ${inventory.totalInputFields}`);
console.log(`Total Select Dropdowns:       ${inventory.totalDropdowns}`);
console.log(`Total Checkboxes:             ${inventory.totalCheckboxes}`);
console.log(`Total Radio Buttons:          ${inventory.totalRadioButtons}`);
console.log(`Total Modals:                 ${inventory.totalModals}`);
console.log(`Total Tables:                 ${inventory.totalTables}`);
console.log(`Total Search Controls:        ${inventory.totalSearchControls}`);
console.log(`Total Filters:                ${inventory.totalFilters}`);
console.log(`Total Pagination Controls:    ${inventory.totalPaginationControls}`);
console.log(`Total API Endpoints:          ${inventory.totalApiEndpoints}`);
console.log(`Total Database Entities:      ${inventory.totalDatabaseEntities}`);
console.log("=========================================================================");
