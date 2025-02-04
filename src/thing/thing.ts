import { Hono } from 'hono'
import sql from '../db.js'
import { registerCreateRoutes } from './create'

const app = new Hono()

// Register create routes
registerCreateRoutes(app)

app.get('/:name/', async (c) => {
  const name = c.req.param('name')

  try {
    const result = await sql`
      WITH outgoing_links AS (
        SELECT 
          t2.id,
          t2.name,
          t2.display_name,
          i.url as link_url
        FROM items i 
        JOIN things t2 ON i.otherthing = t2.id
        WHERE i.thing = (SELECT id FROM things WHERE name = ${name})
      ),
      incoming_links AS (
        SELECT 
          t2.id,
          t2.name,
          t2.display_name
        FROM items i 
        JOIN things t2 ON i.thing = t2.id
        WHERE i.otherthing = (SELECT id FROM things WHERE name = ${name})
      )
      SELECT 
        t.id,
        t.name,
        t.display_name,
        t.icon_url,
        t.url,
        array_agg(DISTINCT jsonb_build_object('id', ol.id, 'name', ol.display_name, 'url', ol.link_url, 'slug', ol.name)) FILTER (WHERE ol.id IS NOT NULL) as outgoing_links,
        array_agg(DISTINCT jsonb_build_object('id', il.id, 'name', il.display_name, 'slug', il.name)) FILTER (WHERE il.id IS NOT NULL) as incoming_links
      FROM things t
      LEFT JOIN outgoing_links ol ON true
      LEFT JOIN incoming_links il ON true
      WHERE t.name = ${name}
      GROUP BY t.id, t.name, t.display_name, t.icon_url, t.url
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
              margin: 0;
              padding: 0;
              display: flex;
            }
            .main-content {
              flex: 1;
              padding: 20px;
              min-height: 100vh;
            }
            .sidebar {
              width: 250px;
              background: #f5f5f5;
              padding: 20px;
              border-left: 1px solid #ddd;
            }
            .back-link {
              display: block;
              margin-bottom: 20px;
              color: #666;
              text-decoration: none;
            }
            .back-link:hover {
              text-decoration: underline;
            }
            .thing-header {
              margin-bottom: 30px;
            }
            .thing-icon {
              max-width: 100px;
              height: auto;
              margin-bottom: 10px;
            }
            .sidebar h2 {
              font-size: 1.2em;
              color: #666;
              margin-top: 0;
            }
            .sidebar ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .sidebar li {
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #ddd;
            }
            .sidebar li:last-child {
              border-bottom: none;
            }
            .sidebar a {
              color: #333;
              text-decoration: none;
            }
            .sidebar a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="main-content">
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
              <h2>Outgoing Links</h2>
              ${thing.outgoing_links && thing.outgoing_links.filter(item => item !== null).length > 0 ? 
                `<ul>
                  ${thing.outgoing_links.filter(item => item !== null).map(item => `
                    <li>
                      <a href="/${item.slug}/">${item.name}</a>
                      ${item.url ? ` (<a href="${item.url}" target="_blank">link</a>)` : ''}
                    </li>
                  `).join('')}
                </ul>`
                : '<p>No outgoing links</p>'
              }
            </div>
          </div>

          <div class="sidebar">
            <h2>Referenced By</h2>
            ${thing.incoming_links && thing.incoming_links.filter(item => item !== null).length > 0 ? 
              `<ul>
                ${thing.incoming_links.filter(item => item !== null).map(item => `
                  <li><a href="/${item.slug}/">${item.name}</a></li>
                `).join('')}
              </ul>`
              : '<p>No incoming links</p>'
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
