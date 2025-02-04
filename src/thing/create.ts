import sql from '../db'
import { Hono } from 'hono'

export function registerCreateRoutes(app: Hono) {
  app.get('/create', async (c) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .form-container {
              max-width: 500px;
              margin: 20px auto;
              padding: 20px;
            }
            .form-group {
              margin-bottom: 15px;
            }
            label {
              display: block;
              margin-bottom: 5px;
            }
            input {
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            button {
              padding: 10px 20px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <h2>Create New Thing</h2>
            <form method="POST">
              <div class="form-group">
                <label for="name">Slug/Name:</label>
                <input type="text" id="name" name="name" required>
              </div>
              <div class="form-group">
                <label for="display_name">Display Name:</label>
                <input type="text" id="display_name" name="display_name" required>
              </div>
              <div class="form-group">
                <label for="icon_url">Icon URL:</label>
                <input type="url" id="icon_url" name="icon_url">
              </div>
              <div class="form-group">
                <label for="url">URL:</label>
                <input type="url" id="url" name="url">
              </div>
              <button type="submit">Create Thing</button>
            </form>
          </div>
        </body>
      </html>
    `
    return c.html(html)
  })

  app.post('/create', async (c) => {
    try {
      const body = await c.req.parseBody()
      const { name, display_name, icon_url, url } = body

      // Basic validation
      if (!name || !display_name) {
        return c.text('Name and Display Name are required', 400)
      }

      // Insert new thing into database
      await sql`
        INSERT INTO things (name, display_name, icon_url, url)
        VALUES (${name}, ${display_name}, ${icon_url || null}, ${url || null})
      `

      // Redirect to home page after successful creation
      return c.redirect('/')
    } catch (error) {
      console.error('Error creating thing:', error)
      return c.text('Failed to create thing', 500)
    }
  })
}
