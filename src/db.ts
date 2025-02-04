import postgres from 'postgres'

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'template1',
  username: 'postgres',
  password: 'your_passwordoijasdlajsdiuasdiuasdasd'
})

export default sql