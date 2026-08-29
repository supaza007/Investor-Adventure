import { RISK_RECOMMENDATIONS } from '../game/learning.js'
import resultBackground from '../assets/ui/main-game-background-user.webp'

const PROFILE_COPY = {
  conservative: {
    title: 'สายมั่นคง',
    summary: 'คุณให้ความสำคัญกับการรักษาเงินต้น และค่อย ๆ เติบโตอย่างสบายใจ',
    benefits: ['เน้นความมั่นคง', 'ลดแรงกระแทก', 'ปรับได้ทุกเมื่อ'],
  },
  balanced: {
    title: 'สายสมดุล',
    summary: 'คุณพร้อมเติบโต แต่ยังอยากมีเกราะช่วยลดแรงกระแทก',
    benefits: ['กระจายความเสี่ยง', 'เหมาะกับผู้เริ่มต้น', 'ปรับได้ทุกเมื่อ'],
  },
  aggressive: {
    title: 'สายเติบโต',
    summary: 'คุณรับความผันผวนได้มากขึ้น เพื่อแลกกับโอกาสเติบโตที่สูงขึ้น',
    benefits: ['โอกาสเติบโตสูง', 'กระจายหลายสินทรัพย์', 'ปรับได้ทุกเมื่อ'],
  },
}

const ASSET_META = {
  กองทุนรวม: { icon: '◆', color: '#36d6a4', note: 'ช่วยกระจายความเสี่ยง' },
  กองทุนรวมผสม: { icon: '◈', color: '#a788ff', note: 'ผสมสินทรัพย์เพื่อสร้างสมดุล' },
  ตราสารหนี้: { icon: '▰', color: '#62a9ff', note: 'ช่วยพยุงพอร์ตให้มั่นคง' },
  หุ้น: { icon: '▲', color: '#f46b7a', note: 'เพิ่มโอกาสเติบโตในระยะยาว' },
  คริปโต: { icon: '✦', color: '#ffbd4a', note: 'เพิ่มโอกาสเติบโตจากสินทรัพย์ผันผวน' },
}

function buildAllocationGradient(assets) {
  let start = 0
  return assets.map(([name, percent]) => {
    const end = start + percent
    const segment = `${ASSET_META[name]?.color ?? '#94a3b8'} ${start}% ${end}%`
    start = end
    return segment
  }).join(', ')
}

export default function RiskResultScreen({ assessment, onContinue }) {
  const profile = RISK_RECOMMENDATIONS[assessment?.riskProfile] ? assessment.riskProfile : 'balanced'
  const recommendation = RISK_RECOMMENDATIONS[profile]
  const copy = PROFILE_COPY[profile]
  const allocationLabel = recommendation.assets.map(([name, percent]) => `${name} ${percent}%`).join(', ')

  return <main
    className="risk-result-screen"
    style={{ backgroundImage: `linear-gradient(rgba(2, 9, 18, .64), rgba(2, 9, 18, .92)), url(${resultBackground})` }}
  >
    <article className="risk-result-card" aria-labelledby="risk-result-title">
      <header className="risk-result-card__topline">
        <span>ชุดเริ่มต้นที่เหมาะกับคุณ</span>
        <small>พร้อมออกผจญภัย</small>
      </header>

      <div className="risk-result-card__hero">
        <div
          className="risk-result-donut"
          style={{ '--risk-result-gradient': buildAllocationGradient(recommendation.assets) }}
          role="img"
          aria-label={`สัดส่วนพอร์ตแนะนำ: ${allocationLabel}`}
        >
          <span aria-hidden="true"><b>{copy.title.replace('สาย', '')}</b><small>เติบโต + มั่นคง</small></span>
        </div>
        <div className="risk-result-card__intro">
          <p>ผลจากคำตอบทั้ง 10 ข้อ</p>
          <h1 id="risk-result-title">คุณเป็นนักลงทุน<br /><strong>{copy.title}</strong></h1>
          <p>{copy.summary}</p>
          <span>ระดับความเสี่ยง · {recommendation.label}</span>
        </div>
      </div>

      <ul className="risk-result-assets" aria-label="สินทรัพย์ในพอร์ตแนะนำ">
        {recommendation.assets.map(([name, percent]) => {
          const meta = ASSET_META[name] ?? { icon: '•', color: '#94a3b8', note: 'ส่วนหนึ่งของพอร์ตทดลอง' }
          return <li key={name} style={{ '--risk-result-asset-color': meta.color }}>
            <span className="risk-result-assets__icon" aria-hidden="true">{meta.icon}</span>
            <span className="risk-result-assets__copy"><b>{name}</b><small>{meta.note}</small></span>
            <strong>{percent}%</strong>
          </li>
        })}
      </ul>

      <div className="risk-result-benefits" aria-label="จุดเด่นของแผน">
        {copy.benefits.map((benefit) => <span key={benefit}>✓ {benefit}</span>)}
      </div>

      <button type="button" className="risk-result-continue" onClick={onContinue}>
        เริ่มผจญภัยด้วยแผนนี้ <span aria-hidden="true">›</span>
      </button>
      <p className="risk-result-disclaimer">นี่คือแผนทดลองในเกม ไม่ใช่คำแนะนำการลงทุนจริง และคุณยังเลือกจัดพอร์ตเองได้ทั้งหมด</p>
    </article>
  </main>
}
