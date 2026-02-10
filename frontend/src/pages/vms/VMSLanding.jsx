import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  QrCode, 
  LogIn, 
  FileCheck, 
  Users, 
  Shield, 
  Building2,
  Share2,
  ClipboardCheck,
  ArrowRight,
  Download,
  Copy,
  Check,
  Smartphone,
  Printer
} from 'lucide-react'
import toast from 'react-hot-toast'

const VMSLanding = () => {
  const navigate = useNavigate()
  const [hoveredCard, setHoveredCard] = useState(null)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')

  // Generate the visitor registration URL
  useEffect(() => {
    const baseUrl = window.location.origin
    setQrUrl(`${baseUrl}/vms/visitor-register`)
  }, [])

  // Generate QR code URL using Google Charts API (free, no library needed)
  const getQRCodeUrl = (size = 200) => {
    const encodedUrl = encodeURIComponent(qrUrl)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&bgcolor=ffffff&color=0d9488&margin=10`
  }

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const link = document.createElement('a')
    link.href = getQRCodeUrl(400)
    link.download = 'Reliable-Group-Visitor-QR.png'
    link.click()
    toast.success('QR Code downloaded!')
  }

  const printQR = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visitor QR Code - Reliable Group</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .container {
            text-align: center;
            border: 3px solid #0d9488;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
          }
          .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
          }
          h1 {
            color: #0d9488;
            margin: 0 0 5px 0;
            font-size: 24px;
          }
          h2 {
            color: #333;
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: normal;
          }
          .qr-code {
            margin: 20px 0;
          }
          .qr-code img {
            width: 250px;
            height: 250px;
          }
          .instructions {
            background: #f0fdfa;
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
          }
          .instructions h3 {
            color: #0d9488;
            margin: 0 0 10px 0;
            font-size: 14px;
          }
          .instructions ol {
            text-align: left;
            margin: 0;
            padding-left: 20px;
            color: #555;
            font-size: 13px;
          }
          .instructions li {
            margin: 5px 0;
          }
          .url {
            font-size: 11px;
            color: #888;
            margin-top: 15px;
            word-break: break-all;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${window.location.origin}/logo.png" alt="Logo" class="logo" />
          <h1>Reliable Group</h1>
          <h2>Visitor Management System</h2>
          
          <div class="qr-code">
            <img src="${getQRCodeUrl(300)}" alt="Visitor Registration QR Code" />
          </div>
          
          <div class="instructions">
            <h3>📱 How to Register as a Visitor</h3>
            <ol>
              <li>Scan this QR code with your phone camera</li>
              <li>Fill in your details</li>
              <li>Take a photo</li>
              <li>Get your digital gatepass</li>
            </ol>
          </div>
          
          <p class="url">${qrUrl}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reliable Group - Visitor Registration',
          text: 'Scan this QR code or visit the link to register as a visitor',
          url: qrUrl
        })
      } catch (err) {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-12 h-12 object-contain bg-white rounded-lg p-1"
            />
            <div>
              <h1 className="text-white font-bold text-xl">Reliable Group</h1>
              <p className="text-teal-300 text-xs">Visitor Management System</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/select-system')}
            className="text-teal-300 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            ← Back to Systems
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Visitor Management System
            </h2>
            <p className="text-teal-200 text-lg">
              Select an option to continue
            </p>
          </div>

          {/* Three Blocks */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Block 1: QR Code for Visitors */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Visitor QR Code</h3>
                    <p className="text-white/80 text-sm">Share & Let Visitors Register</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* QR Code Display */}
                <div className="bg-white rounded-xl p-4 mb-4">
                  <div className="flex justify-center">
                    {qrUrl && (
                      <img 
                        src={getQRCodeUrl(180)} 
                        alt="Visitor Registration QR Code"
                        className="w-44 h-44"
                      />
                    )}
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-2">
                    Scan to register as a visitor
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-white/10 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2 text-white/90 text-sm">
                    <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Visitors scan this QR with their phone to fill details and get gatepass</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={copyLink}
                    className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg py-2.5 px-3 text-white text-sm font-medium transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={shareQR}
                    className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg py-2.5 px-3 text-white text-sm font-medium transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={downloadQR}
                    className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg py-2.5 px-3 text-white text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={printQR}
                    className="flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg py-2.5 px-3 text-white text-sm font-medium transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>

            {/* Block 2: Staff Login */}
            <div
              onClick={() => navigate('/vms/login')}
              onMouseEnter={() => setHoveredCard('login')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative overflow-hidden rounded-2xl cursor-pointer
                transform transition-all duration-300
                ${hoveredCard === 'login' ? 'scale-105 -translate-y-2 shadow-2xl shadow-blue-500/30' : 'shadow-lg'}
              `}
            >
              <div className={`
                absolute inset-0 bg-gradient-to-br transition-all duration-300
                ${hoveredCard === 'login' ? 'from-blue-600 to-indigo-700' : 'from-blue-500 to-indigo-600'}
              `} />

              <div className="relative p-6">
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                  bg-white/20 backdrop-blur-sm
                  ${hoveredCard === 'login' ? 'scale-110' : 'scale-100'}
                  transition-transform duration-300
                `}>
                  <LogIn className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-1">Staff Login</h3>
                <p className="text-white/80 text-sm font-medium mb-3">Company & Reception</p>
                <p className="text-white/70 text-sm mb-6 min-h-[60px]">
                  Company staff can view their visitors. Reception can manage all visitors and entries
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-white/90">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">Company Access</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Reception Desk</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Role-Based View</span>
                  </div>
                </div>

                <div className={`
                  flex items-center justify-center gap-2 
                  bg-white/20 hover:bg-white/30 
                  rounded-xl py-3 px-4 
                  text-white font-semibold
                  transition-all duration-300
                  ${hoveredCard === 'login' ? 'bg-white/30' : ''}
                `}>
                  <span>Continue</span>
                  <ArrowRight className={`
                    w-5 h-5 transition-transform duration-300
                    ${hoveredCard === 'login' ? 'translate-x-1' : ''}
                  `} />
                </div>
              </div>
            </div>

            {/* Block 3: Pre-Approval */}
            <div
              onClick={() => navigate('/vms/pre-approval')}
              onMouseEnter={() => setHoveredCard('pre-approval')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative overflow-hidden rounded-2xl cursor-pointer
                transform transition-all duration-300
                ${hoveredCard === 'pre-approval' ? 'scale-105 -translate-y-2 shadow-2xl shadow-purple-500/30' : 'shadow-lg'}
              `}
            >
              <div className={`
                absolute inset-0 bg-gradient-to-br transition-all duration-300
                ${hoveredCard === 'pre-approval' ? 'from-purple-600 to-pink-700' : 'from-purple-500 to-pink-600'}
              `} />

              <div className="relative p-6">
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                  bg-white/20 backdrop-blur-sm
                  ${hoveredCard === 'pre-approval' ? 'scale-110' : 'scale-100'}
                  transition-transform duration-300
                `}>
                  <ClipboardCheck className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-1">Pre-Approval</h3>
                <p className="text-white/80 text-sm font-medium mb-3">Generate & Share</p>
                <p className="text-white/70 text-sm mb-6 min-h-[60px]">
                  Companies can pre-generate gatepasses for expected visitors and share via WhatsApp
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-white/90">
                    <FileCheck className="w-4 h-4" />
                    <span className="text-sm">Pre-Generate Pass</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm">Share on WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="text-sm">Track Approvals</span>
                  </div>
                </div>

                <div className={`
                  flex items-center justify-center gap-2 
                  bg-white/20 hover:bg-white/30 
                  rounded-xl py-3 px-4 
                  text-white font-semibold
                  transition-all duration-300
                  ${hoveredCard === 'pre-approval' ? 'bg-white/30' : ''}
                `}>
                  <span>Continue</span>
                  <ArrowRight className={`
                    w-5 h-5 transition-transform duration-300
                    ${hoveredCard === 'pre-approval' ? 'translate-x-1' : ''}
                  `} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-10 text-center">
            <p className="text-teal-300/60 text-sm">
              For assistance, contact reception or security desk
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-teal-200/60 text-sm">
          © {new Date().getFullYear()} Reliable Group. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default VMSLanding
