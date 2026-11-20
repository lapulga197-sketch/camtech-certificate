# ស្ទូឌីយោឯកសារ (Certificate Studio)

ប្រព័ន្ធដាច់ដោយឡែក (database + Vercel ផ្ទាល់ខ្លួន) សម្រាប់រចនា និងបោះពុម្ព៖
សញ្ញាបត្រ · ប័ណ្ណសរសើរ · លិខិតសរសើរ · លិខិតជូនពរ · កាតសិស្ស (មុខ/ក្រោយ, ព្រីនច្រើនកាតលើ A4)។

- អ្នកប្រើចុះឈ្មោះដោយខ្លួនឯង → **ត្រូវរង់ចាំអេដមីនអនុម័ត** ទើបអាចចូលបាន (`/admin/users`)
- គំរូ (templates) រក្សាទុកតាមអ្នកប្រើ — អេដមីនអាច «ចែករំលែក» គំរូទៅអ្នកផ្សេង
- តារាង database បង្កើតស្វ័យប្រវត្តិនៅពេលប្រើលើកដំបូង — **មិនបាច់ run command ណាមួយទេ**

## របៀប Deploy (ធ្វើក្នុង browser ទាំងអស់)

1. **Neon** (neon.tech) → New Project (ថ្មី ដាច់ពីប្រព័ន្ធដើម) → ចម្លង *Connection string* (ជម្រើស Pooled)។
2. **Vercel** → Add New → Project → ជ្រើស GitHub repo ហើយជ្រើស branch `certificate-studio`
   (Settings → Git → Production Branch = `certificate-studio`)។ Framework = Next.js។
3. Vercel → Settings → Environment Variables ដាក់៖

| Name | តម្លៃ |
|------|-------|
| `DATABASE_URL` | connection string ពី Neon |
| `AUTH_SECRET` | អក្សរចៃដន្យវែងៗ (≥ 32 តួ) |
| `ADMIN_EMAIL` | អ៊ីមែលអេដមីនដំបូង |
| `ADMIN_PASSWORD` | លេខសម្ងាត់អេដមីនដំបូង (≥ 6 តួ) |
| `NEXTAUTH_URL` | អាសយដ្ឋានគេហទំព័រ ឧ. `https://xxx.vercel.app` (សម្រាប់ QR ផ្ទៀងផ្ទាត់) |

4. Deploy → បើកគេហទំព័រ → ចូលដោយ `ADMIN_EMAIL` / `ADMIN_PASSWORD`។
5. អ្នកផ្សេងចុះឈ្មោះនៅ `/register` → អេដមីនចូល **អ្នកប្រើប្រាស់** → ចុច «អនុម័ត»។

> បើមិនដាក់ `ADMIN_EMAIL` គណនីដំបូងគេដែលចុះឈ្មោះនឹងក្លាយជាអេដមីនធំស្វ័យប្រវត្តិ។

## Local

```
npm install
cp .env.example .env   # បំពេញ DATABASE_URL ...
npm run dev
```
