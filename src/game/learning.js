export const ASSESSMENT_VERSION = 'learning-reflection-v1'
export const CONSENT_VERSION = 'research-consent-v1'

export const PRE_QUESTIONS = [
  { id: 'risk', prompt: 'ถ้าพอร์ตลดลง 20% คุณคิดว่าตนเองจะทำอย่างไร', options: [['1', 'ขายทั้งหมดเพื่อลดความกังวล'], ['2', 'ทบทวนแผนก่อนตัดสินใจ'], ['3', 'ถือหรือปรับตามเป้าหมายเดิม']] },
  { id: 'inflation', prompt: 'เงินเฟ้อส่งผลต่อเงินสดระยะยาวอย่างไร', options: [['0', 'ไม่มีผล'], ['2', 'กำลังซื้อมีโอกาสลดลง'], ['1', 'ทำให้เงินสดเพิ่มมูลค่า']] },
  { id: 'diversification', prompt: 'การกระจายเงินหลายสินทรัพย์ช่วยเรื่องใด', options: [['2', 'ลดการกระจุกตัว แต่ไม่รับประกันกำไร'], ['0', 'รับประกันว่าไม่ขาดทุน'], ['1', 'ทำให้ผลตอบแทนสูงสุดเสมอ']] },
]

export const POST_QUESTIONS = [
  { id: 'inflation', domain: 'เงินเฟ้อและกำลังซื้อ', prompt: 'ถือเงินสดอย่างเดียวเป็นเวลานานมีความเสี่ยงสำคัญใด', options: [['2', 'กำลังซื้อถูกเงินเฟ้อลดทอน'], ['0', 'ไม่มีความเสี่ยง'], ['1', 'ราคาหุ้นผันผวน']] },
  { id: 'diversification', domain: 'ความเสี่ยงและการกระจาย', prompt: 'ข้อใดอธิบายพอร์ตกระจายความเสี่ยงได้เหมาะสมที่สุด', options: [['0', 'ถือสินทรัพย์เดียวที่เคยให้ผลตอบแทนดี'], ['2', 'กระจายความเสี่ยงตามเป้าหมายและข้อจำกัด'], ['1', 'เปลี่ยนพอร์ตทุกครั้งที่ตลาดลง']] },
  { id: 'safety', domain: 'ค่าธรรมเนียมและมิจฉาชีพ', prompt: 'ข้อเสนอใดเป็นสัญญาณเตือนมิจฉาชีพ', options: [['1', 'อธิบายความเสี่ยงและค่าธรรมเนียม'], ['2', 'การันตีกำไรสูงและเร่งให้โอนทันที'], ['0', 'ให้เวลาอ่านข้อมูล']] },
]

export function scoreAssessment(questions, answers) {
  if (!answers || questions.some((q) => answers[q.id] == null)) return null
  const scores = Object.fromEntries(questions.map((q) => [q.id, Number(answers[q.id])]))
  return { instrumentVersion: ASSESSMENT_VERSION, answers: { ...answers }, scores, total: Object.values(scores).reduce((a, b) => a + b, 0), completedAt: new Date().toISOString() }
}

export function buildLearningSummary(pre, post) {
  if (!pre || !post) return { status: 'not_assessed', knowledgeGain: null }
  const comparable = ['inflation', 'diversification'].filter((id) => pre.scores[id] != null && post.scores[id] != null)
  if (!comparable.length) return { status: 'not_assessed', knowledgeGain: null }
  return { status: 'assessed', knowledgeGain: comparable.reduce((sum, id) => sum + post.scores[id] - pre.scores[id], 0), domains: post.scores }
}

export function buildReadiness(report, assessment) {
  const financial = Math.max(0, Math.min(100, Math.round(report.ratio * 60)))
  const resilience = report.chapters.length ? Math.round(report.chapters.reduce((sum, c) => sum + c.prep.score * 100, 0) / report.chapters.length) : null
  const capability = assessment?.post ? Math.round((assessment.post.total / (POST_QUESTIONS.length * 2)) * 100) : null
  return [
    { id: 'financial', label: 'ความพร้อมทางการเงินในสถานการณ์จำลอง', score: financial, evidence: `มูลค่าปลายเกมเทียบเกณฑ์จำลอง ${(report.ratio * 100).toFixed(0)}%` },
    { id: 'resilience', label: 'ความยืดหยุ่นของแผน', score: resilience, evidence: 'คำนวณจากการกระจุกตัวและ exposure ใน 4 บท' },
    { id: 'life', label: 'ชีวิตและสุขภาพ', score: null, evidence: 'เกมไม่ได้เก็บข้อมูลชีวิตหรือสุขภาพ จึงไม่ประเมิน' },
    { id: 'capability', label: 'ความรู้และความปลอดภัยทางการเงิน', score: capability, evidence: capability == null ? 'ยังไม่ได้ทำแบบสะท้อนหลังเล่น' : 'คำนวณจากคำตอบหลังเล่น 3 ด้าน' },
  ]
}
