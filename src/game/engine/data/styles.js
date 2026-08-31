// สไตล์นักลงทุน 4 แบบ (แทนคลาสตัวละครเดิม)
// หัวใจ: แต่ละสไตล์บังคับให้เล่นกับ Encounter Engine ต่างกันจริง ไม่ใช่แค่เปลี่ยนเลข/สกิน
// ต่างจากคลาสเดิมตรงที่ทุกสไตล์ซื้อเครื่องมือไหนก็ได้ ต่างกันแค่ "วิธีเล่นกับมัน" (ดีไซน์ข้อ 6)
//
// canAdjustAt = สเตจที่ปรับพอร์ตได้ ('allocation' = ช่วงจัดพอร์ตต้นบท, 1-4 = สเตจในบท)

const STYLES = [
  {
    id: 'medium',
    name: 'Midterm Investor',
    emoji: '⚖️',
    tagline: 'นักลงทุนผู้มีเป้าหมายชัดเจนในการใช้เงินในอนาคต',
    favoriteAssets: 'กองทุนรวม',
    persona: 'เหมาะกับคนเล่นครั้งแรก ยังไม่อยากคิดเยอะ',
    pros: 'รู้เหตุการณ์แล้ว ปรับพอร์ตฟรีได้ 1 ครั้ง',
    cons: 'ไม่มีโบนัสกำไรหรือการฟื้นตัวเพิ่มเติม',
    canAdjustAt: ['allocation', 2],
    adjustmentPromptStages: [2],
    maxMidStageAdjustmentsPerChapter: 1,
    abilityId: 'flex_rebalance',
    returnMult: 1.0,
    isDefault: true,
    lesson: 'การลงทุนระยะกลางคือทางสายกลาง ปรับพอร์ตตามสถานการณ์ได้บ้าง แต่ไม่ไล่ตามตลาดทุกวัน',
  },
  {
    id: 'longterm',
    name: 'Longterm Investor',
    emoji: '🛡️',
    tagline: 'นักลงทุนผู้มองกาลใกล้ และมีความอดทนสูงเพื่อความมั่งคั่งในระยะยาว',
    favoriteAssets: 'ตราสารหนี้ และ กองทุนรวม',
    persona: 'เหมาะกับคนขี้เกียจเช็ค ตั้งแล้วอยากลืมไปเลย',
    pros: 'ถือยาวแล้วได้โบนัสทบต้น 10%',
    cons: 'ตั้งพอร์ตพลาดตั้งแต่ต้นบท แก้ไม่ได้จนจบบท (10 ปี)',
    canAdjustAt: ['allocation'],
    returnMult: 1.10,
    abilityId: 'patient_compounding',
    lesson:
      'เวลาในตลาดสำคัญกว่าการจับจังหวะตลาด (Time in the market beats timing the market) การถือยาวให้ดอกเบี้ยทบต้นทำงานเต็มที่ และลดโอกาสตัดสินใจผิดตอนตกใจ',
  },
  {
    id: 'trader',
    name: 'Trader',
    emoji: '🗡️',
    tagline: 'นักลงทุนผู้หลักแหลมเฉียบคม เน้นการสร้างผลตอบแทนระยะสั้นอย่างมีวินัย',
    favoriteAssets: 'หุ้น และ คริปโต',
    persona: 'เหมาะกับคนชอบเช็คพอร์ตบ่อยๆ อยากรู้สึกคุมได้ทุกจังหวะ',
    pros: 'ปรับพอร์ตได้ตอนเห็นสัญญาณและหลังรู้เหตุการณ์ ครั้งแรกของบทลดค่าธรรมเนียมครึ่งหนึ่ง',
    cons: 'หลังครั้งแรกเสียค่าธรรมเนียม 2% ทุกครั้งที่ขยับ สะสมแล้วกัดกินกำไรจริง',
    canAdjustAt: ['allocation', 1, 2],
    adjustmentPromptStages: [1, 2],
    returnMult: 1.0,
    tradeFeePct: 0.02, // 2% ของมูลค่าที่ย้ายทุกครั้งที่ปรับพอร์ต
    firstTradeFeeMult: 0.5,
    abilityId: 'active_rebalance',
    lesson:
      'การซื้อขายบ่อย (Overtrading) กัดกินผลตอบแทนด้วยค่าธรรมเนียมและภาษี งานวิจัยพบว่านักลงทุนที่ซื้อขายบ่อยที่สุดมักได้ผลตอบแทนต่ำที่สุด',
  },
  {
    id: 'vi',
    name: 'Value Investor',
    emoji: '🌱',
    tagline: 'นักลงทุนผู้เข้าใจธุรกิจและเทรนในอนาคตอย่างลึกซึ้ง',
    favoriteAssets: 'ตราสารหนี้',
    persona: 'เหมาะกับคนใจแข็ง กล้าซื้อตอนคนอื่นแห่ขาย',
    pros: 'ซื้อเพิ่มอย่างน้อย 15% ของพอร์ต แล้วฟื้นได้สูงสุด 100% ของที่เสีย',
    cons: 'ถ้าเงินสดไม่ถึง 15% จะฟื้นเท่าผู้เล่นทั่วไปเพียง 50%',
    canAdjustAt: ['allocation'],
    returnMult: 1.0,
    buyDipMult: 2.0, // ซื้อเพิ่มฟื้น 50% ตามฐาน แล้ว VI เพิ่มเป็นฟื้น 100% ของที่เสีย
    minBuyDipCashShare: 0.15,
    abilityId: 'value_buy_dip',
    lesson:
      'จงกลัวเมื่อคนอื่นโลภ และจงโลภเมื่อคนอื่นกลัว (วอร์เรน บัฟเฟตต์) การซื้อตอนราคาร่วงคือการซื้อของดีในราคาถูก แต่ต้องแยกให้ออกว่าราคาร่วงเพราะตลาดตกใจ หรือเพราะกิจการแย่จริง',
  },
]

export const getStyles = () => STYLES
export const getStyle = (id) => STYLES.find((s) => s.id === id)

// สไตล์นี้ปรับพอร์ตที่จุดนี้ได้ไหม ('allocation' หรือเลขสเตจ 1-5)
export const canAdjustAt = (style, point) => style.canAdjustAt.includes(point)
