export const ASSESSMENT_VERSION = 'learning-reflection-v2'
export const CONSENT_VERSION = 'research-consent-v1'

/* TEXT: คำถามก่อนเริ่มเกมทั้งหมด 10 ข้อ
   แก้ข้อความคำถามที่ prompt และแก้ข้อความตัวเลือกที่ options */
export const PRE_QUESTIONS = [
  { id: 'life_stage', prompt: 'ตอนนี้คุณอยู่ช่วงไหนของชีวิต', options: [['2', ' ยังอายุไม่เกิน 30 ปี เพิ่งเริ่มทำงานหรือเริ่มเก็บเงิน'], ['1', ' อายุ 31-55 ปี อยู่ในวัยทำงานและเริ่มมีเงินเก็บ'], ['0', ' อายุเกิน 55 ปี ใกล้เกษียณและอยากใช้ชีวิตสบาย ๆ']] },
  { id: 'volatility_view', prompt: 'ถ้าพูดถึง “ราคาขึ้นลงแรง” คุณคิดถึงอะไร', options: [['2', ' เป็นโอกาสทำกำไร ซื้อถูก ขายแพง'], ['1', ' เป็นความไม่แน่นอน ต้องระวัง'], ['0', ' น่ากลัว เพราะอาจขาดทุนได้']] },
  { id: 'investing_style_self_view', prompt: 'ถ้าต้องลงทุน คุณคิดว่าสไตล์คุณเป็นแบบไหน', options: [['2', ' กล้าเสี่ยง กล้าตัดสินใจ เพื่อหวังกำไรสูง'], ['0', ' เน้นปลอดภัย ได้กำไรน้อยก็ไม่เป็นไร'], ['1', ' ยืดหยุ่น ดูจังหวะ บางครั้งเสี่ยงบ้าง']] },
  { id: 'loss_attribution', prompt: 'ถ้าลงทุนแล้วขาดทุน คุณคิดว่าสาเหตุหลักคืออะไร', options: [['0', ' เราตัดสินใจผิดเอง'], ['1', ' ตลาดผันผวนและคาดเดายาก'], ['2', ' มีทั้งการตัดสินใจของเราและสภาพตลาด']] },
  { id: 'one_year_return_loss', prompt: 'ถ้ามองไปอีก 1 ปี คุณอยากให้เงินลงทุนเป็นแบบไหน', options: [['0', ' ได้กำไรแน่นอนประมาณ 5%'], ['1', ' อยากได้กำไร 10% แต่ถ้าขาดทุน 5% ก็รับได้'], ['2', ' อยากได้กำไร 20% แต่ถ้าขาดทุน 10% ก็รับได้']] },
  { id: 'windfall_allocation', prompt: 'ถ้าถูกลอตเตอรี่ได้เงิน 500,000 บาท คุณจะเอาไปทำอะไร', options: [['0', ' ฝากประจำหรือซื้อพันธบัตร เน้นเงินต้นปลอดภัย'], ['1', ' แบ่งครึ่งหนึ่งลงทุนหุ้น อีกครึ่งหนึ่งลงทุนแบบปลอดภัย'], ['2', ' ลงทุนหุ้นไปเลย หวังผลตอบแทนสูง']] },
  { id: 'job_loss_travel', prompt: 'ถ้าวางแผนเที่ยวต่างประเทศไว้ แต่จู่ ๆ โดนเลิกจ้าง คุณจะทำยังไง', options: [['0', ' ยกเลิกทริปก่อน รอหางานใหม่ได้ค่อยไป'], ['1', ' เปลี่ยนเป็นทริปประหยัดแทน'], ['2', ' ไปเที่ยวตามแผนเดิม กลับมาค่อยหาทางต่อ']] },
  { id: 'game_show_choice', prompt: 'ถ้าเล่นเกมโชว์มาถึงรอบตัดสินใจ คุณจะเลือกอะไร', options: [['0', ' หยุดเล่น รับเงินแน่นอน 30,000 บาท'], ['1', ' เล่นต่อ มี 2 ตัวเลือก ถ้าถูกรับ 60,000 บาท ถ้าผิดไม่ได้อะไร'], ['2', ' เล่นต่อ มี 4 ตัวเลือก ถ้าถูกรับ 120,000 บาท ถ้าผิดไม่ได้อะไร']] },
  { id: 'land_opportunity', prompt: 'เพื่อนชวนลงทุนซื้อที่ดิน มีโอกาสราคาขึ้นเท่าตัวใน 1 ปี คุณจะลงทุนเมื่อไหร่', options: [['2', ' ถึงโอกาสขึ้นจะน้อย ก็อยากลองลงทุน'], ['1', ' ถ้ามีโอกาสขึ้นพอสมควร ถึงจะลงทุน'], ['0', ' ต้องมีโอกาสขึ้นสูงมาก ถึงจะลงทุน']] },
  { id: 'income_preference', prompt: 'ถ้ามีคนชวนไปทำงาน และให้เลือกรูปแบบรายได้ คุณจะเลือกแบบไหน', options: [['0', ' เงินเดือนแน่นอนเป็นหลัก ค่านายหน้านิดหน่อย'], ['1', ' เงินเดือนครึ่งหนึ่ง ค่านายหน้าครึ่งหนึ่ง'], ['2', ' เงินเดือนน้อย แต่เน้นค่านายหน้าตามผลงาน']] },
]

/* TEXT: คำถามหลังเล่นจบทั้งหมด 3 ข้อ
   แก้ข้อความคำถามที่ prompt และแก้ข้อความตัวเลือกที่ options */
export const POST_QUESTIONS = [
  { id: 'inflation', domain: 'เงินเฟ้อและกำลังซื้อ', prompt: 'ถือเงินสดอย่างเดียวเป็นเวลานานมีความเสี่ยงสำคัญใด', options: [['2', 'กำลังซื้อถูกเงินเฟ้อลดทอน'], ['0', 'ไม่มีความเสี่ยง'], ['1', 'ราคาหุ้นผันผวน']] },
  { id: 'diversification', domain: 'ความเสี่ยงและการกระจาย', prompt: 'ข้อใดอธิบายพอร์ตกระจายความเสี่ยงได้เหมาะสมที่สุด', options: [['0', 'ถือสินทรัพย์เดียวที่เคยให้ผลตอบแทนดี'], ['2', 'กระจายความเสี่ยงตามเป้าหมายและข้อจำกัด'], ['1', 'เปลี่ยนพอร์ตทุกครั้งที่ตลาดลง']] },
  { id: 'safety', domain: 'ค่าธรรมเนียมและมิจฉาชีพ', prompt: 'ข้อเสนอใดเป็นสัญญาณเตือนมิจฉาชีพ', options: [['1', 'อธิบายความเสี่ยงและค่าธรรมเนียม'], ['2', 'การันตีกำไรสูงและเร่งให้โอนทันที'], ['0', 'ให้เวลาอ่านข้อมูล']] },
]

export function scoreAssessment(questions, answers) {
  if (!answers || questions.some((q) => answers[q.id] == null)) return null
  const scores = Object.fromEntries(questions.map((q) => [q.id, Number(answers[q.id])]))
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  const maxScore = questions.length * 2
  const riskProfile = questions === PRE_QUESTIONS ? classifyRiskProfile(total, maxScore) : null
  return { instrumentVersion: ASSESSMENT_VERSION, answers: { ...answers }, scores, total, maxScore, riskProfile, completedAt: new Date().toISOString() }
}

export function buildLearningSummary(pre, post) {
  if (!pre) return { status: 'not_assessed', knowledgeGain: null, preRiskProfile: null }
  if (!post) return { status: 'risk_profile_only', knowledgeGain: null, preRiskProfile: pre.riskProfile ?? null }
  const comparable = ['inflation', 'diversification'].filter((id) => pre.scores[id] != null && post.scores[id] != null)
  if (!comparable.length) return { status: 'risk_profile_only', knowledgeGain: null, preRiskProfile: pre.riskProfile ?? null, domains: post.scores }
  return { status: 'assessed', knowledgeGain: comparable.reduce((sum, id) => sum + post.scores[id] - pre.scores[id], 0), preRiskProfile: pre.riskProfile ?? null, domains: post.scores }
}

export function classifyRiskProfile(total, maxScore) {
  if (!Number.isFinite(total) || !Number.isFinite(maxScore) || maxScore <= 0) return null
  const ratio = total / maxScore
  if (ratio < 0.34) return 'conservative'
  if (ratio < 0.67) return 'balanced'
  return 'aggressive'
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
