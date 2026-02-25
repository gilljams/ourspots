// Table templates definition - shared between TableBlock (display) and TableBlockEditor (editor)
export const TABLE_TEMPLATES = {
  // Simple list - 1 column + checkbox
  list: {
    id: 'list',
    name: 'Lista',
    icon: 'CheckSquare',
    showSum: false,
    hideHeader: true,
    useCollapse: true,
    columns: [
      { id: 'done', label: '', type: 'checkbox', width: 'w-8', hideInEditor: true },
      { id: 'item', label: 'Punkt', type: 'text', width: 'flex-1' }
    ]
  },
  // Simple table - 2 columns + checkbox, col2Type determines second column type
  table: {
    id: 'table',
    name: 'Tabell',
    icon: 'Table2',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
      { id: 'col1', label: 'Text', type: 'text', width: 'flex-1' },
      { id: 'col2', label: 'Värde', type: 'text', width: 'w-36' }
    ]
  },
  // Legacy templates for backward compatibility
  tasks: {
    id: 'tasks',
    name: 'Uppgifter',
    icon: 'ClipboardList',
    showSum: false,
    useCollapse: true,
    legacy: true,
    columns: [
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
      { id: 'task', label: 'Uppgift', type: 'text', width: 'flex-1' },
      { id: 'who', label: 'Ansvarig', type: 'text', width: 'w-24' }
    ]
  },
  shopping: {
    id: 'shopping',
    name: 'Inköpslista',
    icon: 'ShoppingCart',
    showSum: false,
    useCollapse: true,
    legacy: true,
    columns: [
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
      { id: 'item', label: 'Vara', type: 'text', width: 'flex-1' },
      { id: 'qty', label: 'Antal', type: 'number', width: 'w-16' }
    ]
  },
  contacts: {
    id: 'contacts',
    name: 'Telefonlista',
    icon: 'UserCircle',
    showSum: false,
    useCollapse: true,
    legacy: true,
    columns: [
      { id: 'name', label: 'Namn', type: 'text', width: 'w-32' },
      { id: 'phone', label: 'Telefon', type: 'text', width: 'flex-1' }
    ]
  },
  // Fusebox / Proppskåp - for electrical panel documentation
  fusebox: {
    id: 'fusebox',
    name: 'Proppskåp',
    icon: 'Zap',
    showSum: false,
    useCollapse: true,
    defaultCollapsed: true,
    columns: [
      { id: 'num', label: 'Nr', type: 'text', width: 'w-12', maxLength: 3, align: 'center' },
      { id: 'description', label: 'Beskrivning', type: 'text', width: 'flex-1' },
      { id: 'amps', label: 'A', type: 'text', width: 'w-14', maxLength: 3, align: 'center', placeholder: '10', suffix: 'A' }
    ]
  }
};
