import { Hono } from 'hono'
import sql from './db'

const app = new Hono()

app.get('/:id/', async (c) => {
  const id = c.req.param('id')

  try {
    const result = await sql`
      SELECT 
        t.id,
        t.display_name,
        t.icon_url,
        t.url,
        array_agg(json_build_object('id', t2.id, 'name', t2.display_name)) as linked_items
      FROM things t
      LEFT JOIN items i ON t.id = i.thing
      LEFT JOIN things t2 ON i.otherthing = t2.id
      WHERE t.id = ${id}
      GROUP BY t.id, t.display_name, t.icon_url, t.url
    `

    if (result.length === 0) {
      return c.text('Thing not found', 404)
    }

    const thing = result[0]

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .thing-header {
              display: flex;
              align-items: center;
              gap: 20px;
              margin-bottom: 20px;
            }
            .thing-icon {
              max-width: 100px;
              height: auto;
            }
            .thing-details {
              margin-top: 20px;
            }
            .linked-items {
              margin-top: 20px;
            }
            a {
              color: #0066cc;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            .back-link {
              display: block;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <a href="/" class="back-link">← Back to list</a>
          
          <div class="thing-header">
            ${thing.icon_url ? 
              `<a href="${thing.url}" target="_blank">
                <img src="${thing.icon_url}" alt="${thing.display_name}" class="thing-icon">
               </a>` 
              : ''}
            <h1>${thing.display_name}</h1>
          </div>

          <div class="thing-details">
            <h2>Details</h2>
            <p><strong>ID:</strong> ${thing.id}</p>
            ${thing.url ? `<p><strong>URL:</strong> <a href="${thing.url}" target="_blank">${thing.url}</a></p>` : ''}
          </div>

          <div class="linked-items">
            <h2>Linked Items</h2>
            ${thing.linked_items && thing.linked_items.filter(item => item !== null).length > 0 ? 
              `<ul>
                ${thing.linked_items.filter(item => item !== null).map(item => `
                  <li><a href="/${item.id}/">${item.name}</a></li>
                `).join('')}
              </ul>`
              : '<p>No linked items</p>'
            }
          </div>
        </body>
      </html>
    `
    return c.html(html)
  } catch (error) {
    console.error('Database connection error:', error)
    return c.text('Failed to connect to database', 500)
  }
})

export default app
