# ARDM Student Portal — connected to the central ERP backend

## Run
```
npm install
# .env  →  VITE_API_BASE_URL=http://localhost:5000/api/v1
npm run dev        # or: npm run build
```
Login = the same ERP account as the Teacher client (11-digit phone or 10-digit teacher code + password).
The JWT is stored under `ardm_erp_jwt_token` / `ardm_erp_auth_user`, so a session is shared with the Teacher client.

## Structure (MVC)
```
src/
  config/systemConfig.js         API base URL, storage keys, CLASS_ORDER, Cloudinary, allowed roles
  services/                      axiosClient · studentApiService · bdAddressApi · cloudinaryClient · apiErrors
  models/studentModel.js         server <-> UI field adapter, class-name normalisation, payload builder,
                                 sibling detection, birthday calc, RBAC helpers, server-error → form mapping
  controllers/
    useStudentController.js      session check, RBAC, load/search/filter/sort, create/update/delete
    exportController.js          Excel · PDF info sheet · table register · bulk ID cards · vCard · copy IDs
  views/                         LoginView · FullForm · DetailView · UIComponents
  Index.jsx                      wires the controller to the views
  info.jsx                       public QR verification page  (/:Id)
  App.jsx                        routes unchanged: / /student /:Id /result /teacher /topper-finder /result-analysis
```

## Untouched on purpose
Print / export templates (`exportController.js`, `DetailView.jsx`), modals (`PdfExportModal`, `AdvancedPdfExport`,
`ImageViewer`, `DeveloperModal`), the Result system and its Firebase/Google Sheet backend.

## Small, deliberate edits to original files
- `AdvancedFilter.jsx` line 10: class-order keys for ২য়/৩য় used a different Unicode form (য + ়) than the class list (য়) —
  the "class between" filter could not match them. Keys now use the same form as the list.
- `TopperFinder.jsx`: student photo lookup now uses the server's public verify endpoint instead of the old Google Sheet.
