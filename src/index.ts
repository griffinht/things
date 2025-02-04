import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import sql from './db'
import thingRoutes from './thing'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const result = await sql`
      SELECT 
        t.id,
        t.name,
        t.display_name,
        t.icon_url,
        t.url,
        array_agg(DISTINCT jsonb_build_object('name', t2.display_name, 'slug', t2.name)) FILTER (WHERE t2.id IS NOT NULL) as linked_items
      FROM things t
      LEFT JOIN items i ON t.id = i.thing
      LEFT JOIN things t2 ON i.otherthing = t2.id
      GROUP BY t.id, t.name, t.display_name, t.icon_url, t.url
      ORDER BY t.display_name
    `
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
            a {
              color: #0066cc;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            .linked-item {
              display: inline-block;
              margin-right: 8px;
            }
            .linked-item:not(:last-child):after {
              content: ",";
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Icon</th>
                <th>Linked Items</th>
              </tr>
            </thead>
            <tbody>
              ${result.map(row => `
                <tr>
                  <td><a href="/${row.name}/">${row.display_name || ''}</a></td>
                  <td>${row.icon_url ? `<a href="${row.url}" target="_blank"><img src="${row.icon_url}" alt="${row.display_name}"></a>` : ''}</td>
                  <td>
                    ${row.linked_items ? 
                      row.linked_items
                        .filter(item => item !== null)
                        .map(item => `<span class="linked-item"><a href="/${item.slug}/">${item.name}</a></span>`)
                        .join(' ') 
                      : ''}
                  </td>
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

app.route('/', thingRoutes)

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
