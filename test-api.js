const fs = require('fs');
fetch('http://localhost:3000/api/admin/users').then(r=>r.json()).then(d=>fs.writeFileSync('out.json', JSON.stringify(d, null, 2)))
