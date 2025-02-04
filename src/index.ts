import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import pg from 'pg'
const { Client } = pg

const app = new Hono()

app.get('/', async (c) => {
  const client = new Client({
    host: 'localhost',
    user: 'postgres',
    password: 'your_passwordoijasdlajsdiuasdiuasdasd',
    database: 'template1',
    port: 5432
  })

  try {
    await client.connect()
    const query = `
      SELECT 
        t.id,
        t.display_name,
        t.icon_url,
        t.url,
        array_agg(t2.display_name) as linked_items
      FROM things t
      LEFT JOIN items i ON t.id = i.thing
      LEFT JOIN things t2 ON i.otherthing = t2.id
      GROUP BY t.id, t.display_name, t.icon_url, t.url
    `
    const result = await client.query(query)
    await client.end()

    // Create HTML table
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            img {
              max-width: 50px;
              height: auto;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Display Name</th>
                <th>Icon</th>
                <th>Linked Items</th>
              </tr>
            </thead>
            <tbody>
              ${result.rows.map(row => `
                <tr>
                  <td>${row.id}</td>
                  <td>${row.display_name || ''}</td>
                  <td>${row.icon_url ? `<a href="${row.url}" target="_blank"><img src="${row.icon_url}" alt="${row.display_name}"></a>` : ''}</td>
                  <td>${row.linked_items ? row.linked_items.filter(item => item !== null).join(', ') : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    return c.html(html)
  } catch (error) {
    console.error('Database connection error:', error)
    return c.text('Failed to connect to database', 500)
  }
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
