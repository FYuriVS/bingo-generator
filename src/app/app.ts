import { Component, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  title = 'bingo-generator';
  titleBingo = '';

  Math = Math;

  showDonationDialog = false;
  pendingExport = false;

  pixKey =
    '00020126580014BR.GOV.BCB.PIX0136d526834b-8244-48e5-90db-f61c6477d2ee5204000053039865802BR5901N6001C62070503***6304EC75';
  pixQrCodeDataUrl = '';

  // Configurações
  cols: number = 5;
  rows: number = 5;
  maxNum: number = 90;
  qtdCards: number = 20;

  // Layout do PDF
  layoutMode: 'auto' | 'manual' = 'auto';
  cartelasPorLinha: number = 2;
  cartelasPorColuna: number = 2;

  // Paletas
  palettes = [
    {
      name: 'Âmbar',
      bg: '#1a1200',
      header: '#c97a00',
      cell1: '#2a1e00',
      cell2: '#1f1600',
      text: '#ffe0a0',
      border: '#c97a00',
    },
    {
      name: 'Oceano',
      bg: '#001320',
      header: '#0066aa',
      cell1: '#00203a',
      cell2: '#001828',
      text: '#a0d8ff',
      border: '#0077cc',
    },
    {
      name: 'Floresta',
      bg: '#0a1a0a',
      header: '#2d7a2d',
      cell1: '#0f230f',
      cell2: '#0a1a0a',
      text: '#a8e6a8',
      border: '#3a903a',
    },
    {
      name: 'Magenta',
      bg: '#1a001a',
      header: '#990099',
      cell1: '#260026',
      cell2: '#1a001a',
      text: '#ffaaff',
      border: '#cc00cc',
    },
    {
      name: 'Coral',
      bg: '#1a0a05',
      header: '#cc4400',
      cell1: '#2a1206',
      cell2: '#1a0a05',
      text: '#ffcdb0',
      border: '#dd5500',
    },
    {
      name: 'Ardósia',
      bg: '#0f1215',
      header: '#334455',
      cell1: '#1a2030',
      cell2: '#141b26',
      text: '#c0d0e0',
      border: '#445566',
    },
    {
      name: 'Monocromático',
      bg: '#1a1a1a',
      header: '#2d2d2d',
      cell1: '#3a3a3a',
      cell2: '#2a2a2a',
      text: '#e0e0e0',
      border: '#ffffff',
    },
    {
      name: 'Cinza Elegante',
      bg: '#121212',
      header: '#757575',
      cell1: '#424242',
      cell2: '#212121',
      text: '#ffffff',
      border: '#757575',
    },
    {
      name: 'Tradicional Bingo',
      bg: '#f5f0e8', // fundo papel cartão envelhecido
      header: '#faf7f2', // vermelho clássico do cabeçalho "BINGO"
      cell1: '#ffffff', // células brancas
      cell2: '#faf7f2', // cinza bem clarinho alternado
      text: '#2c2c2c', // texto cinza escuro (nunca preto puro)
      border: '#d4c9b8', // borda suave cor de papel
    },
  ];

  selectedPaletteIndex: number = 0;

  // Imagem
  customImage: string | null = null;
  useLionFlag: boolean = true;

  // Dados gerados
  generatedCards: any[] = [];

  @ViewChildren('lionCanvas') lionCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  ngAfterViewInit() {
    this.lionCanvases.changes.subscribe(() => {
      this.drawAllLions();
    });
  }

  drawAllLions() {
    this.lionCanvases.forEach((canvasRef) => {
      if (canvasRef && canvasRef.nativeElement) {
        this.drawLion(canvasRef.nativeElement);
      }
    });
  }

  get currentPalette() {
    return this.palettes[this.selectedPaletteIndex];
  }

  get isLionSelected(): boolean {
    return this.useLionFlag && !this.customImage;
  }

  get cartelasPorPagina(): number {
    return this.cartelasPorLinha * this.cartelasPorColuna;
  }

  get pixQrCode(): string {
    const payload = encodeURIComponent(this.pixKey);

    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${payload}`;
  }

  async generatePixQrCode() {
    this.pixQrCodeDataUrl = await QRCode.toDataURL(this.pixKey, {
      width: 280,
      margin: 2,
    });
  }

  // Método para calcular layout automático
  calcularLayoutAuto(totalCartelas: number): { linhas: number; colunas: number } {
    let melhorLinhas = 1;
    let melhorColunas = 1;
    let melhorScore = 0;

    for (let linhas = 1; linhas <= 5; linhas++) {
      for (let colunas = 1; colunas <= 5; colunas++) {
        const cartelasPorPagina = linhas * colunas;
        if (cartelasPorPagina > totalCartelas && totalCartelas > 0) continue;

        const margin = 12;
        const gap = 4;
        const larguraUtil = 210 - margin * 2 - gap * (colunas - 1);
        const alturaUtil = 297 - margin * 2 - gap * (linhas - 1);

        const larguraCarta = larguraUtil / colunas;
        const alturaCarta = alturaUtil / linhas;

        const proporcao = Math.min(larguraCarta, alturaCarta) / Math.max(larguraCarta, alturaCarta);
        const areaUtilizada = larguraCarta * alturaCarta * cartelasPorPagina;
        const eficienciaArea = areaUtilizada / (210 * 297);

        const score = proporcao * 0.7 + eficienciaArea * 0.3;

        if (score > melhorScore) {
          melhorScore = score;
          melhorLinhas = linhas;
          melhorColunas = colunas;
        }
      }
    }

    return { linhas: melhorLinhas, colunas: melhorColunas };
  }

  getLayoutConfig(totalCartelas: number): { linhas: number; colunas: number; paginas: number } {
    let linhas: number, colunas: number;

    if (this.layoutMode === 'auto') {
      const auto = this.calcularLayoutAuto(totalCartelas);
      linhas = auto.linhas;
      colunas = auto.colunas;
    } else {
      linhas = this.cartelasPorLinha;
      colunas = this.cartelasPorColuna;
    }

    const cartelasPorPagina = linhas * colunas;
    const paginas = Math.ceil(totalCartelas / cartelasPorPagina);

    return { linhas, colunas, paginas };
  }

  private shuffleArray(arr: any[]): any[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  generateGrid(): any[] | null {
    const total = this.rows * this.cols - 1;
    if (total > this.maxNum) return null;

    const numbers = Array.from({ length: this.maxNum }, (_, i) => i + 1);
    const shuffled = this.shuffleArray([...numbers]);
    const selected = shuffled.slice(0, total);

    const midIdx = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
    const grid: (number | null)[] = [];
    let numIndex = 0;

    for (let i = 0; i < this.rows * this.cols; i++) {
      if (i === midIdx) {
        grid.push(null);
      } else {
        grid.push(selected[numIndex++]);
      }
    }

    return grid;
  }

  generateCards(): void {
    const needed = this.rows * this.cols - 1;
    if (needed > this.maxNum) {
      alert(
        `Precisa de pelo menos ${needed} números para uma cartela ${this.rows}×${this.cols}.\nAumente o "Nº máx." para pelo menos ${needed}.`,
      );
      return;
    }

    this.generatedCards = [];
    for (let i = 0; i < this.qtdCards; i++) {
      const card = this.generateGrid();
      if (card) this.generatedCards.push(card);
    }

    setTimeout(() => this.drawAllLions(), 0);
  }

  selectPalette(index: number): void {
    this.selectedPaletteIndex = index;
    setTimeout(() => this.drawAllLions(), 0);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.customImage = e.target?.result as string;
      this.useLionFlag = false;
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.customImage = null;
    this.useLionFlag = false;
    const fileInput = document.getElementById('imgInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  useLion(): void {
    this.customImage = null;
    this.useLionFlag = true;
    const fileInput = document.getElementById('imgInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setTimeout(() => this.drawAllLions(), 0);
  }

  drawLion(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width,
      h = canvas.height;
    const cx = w / 2,
      cy = h / 2;
    const s = Math.min(w, h) * 0.42;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#E6A817';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 1.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D4920F';
    for (let a = 0; a < 360; a += 45) {
      const r = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(r) * s, cy + Math.sin(r) * s, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F5D49A';
    ctx.strokeStyle = '#C47E0A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E6A817';
    ctx.strokeStyle = '#C47E0A';
    ctx.lineWidth = 1;
    [
      [-0.6, 0.65],
      [0.6, 0.65],
    ].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - dy * s, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F5D49A';
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - dy * s, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E6A817';
    });

    ctx.fillStyle = '#FDEBD0';
    ctx.strokeStyle = '#C47E0A';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.16, s * 0.34, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E07070';
    ctx.strokeStyle = '#B05050';
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.14, cy + s * 0.18);
    ctx.lineTo(cx + s * 0.14, cy + s * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#8B5A1E';
    ctx.beginPath();
    ctx.arc(cx - s * 0.16, cy + s * 0.32, s * 0.18, -0.2, Math.PI + 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 0.16, cy + s * 0.32, s * 0.18, 0, Math.PI + 0.4, true);
    ctx.stroke();

    ctx.fillStyle = '#5C3A1E';
    [
      [-0.3, -0.26],
      [0.3, -0.26],
    ].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy + dy * s, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + dx * s + s * 0.04, cy + dy * s + s * 0.03, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5C3A1E';
    });

    ctx.strokeStyle = 'rgba(100,70,20,0.7)';
    ctx.lineWidth = 1;
    [
      [-0.12, 0, 0.04],
      [0, 0, 0],
      [0.12, 0, -0.04],
    ].forEach(([dy]) => {
      const y2 = cy + s * 0.2 + dy * s;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.34, y2);
      ctx.lineTo(cx - s * 0.72, y2 - s * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.34, y2);
      ctx.lineTo(cx + s * 0.72, y2 - s * 0.06);
      ctx.stroke();
    });
  }

  async continueExport(): Promise<void> {
    this.showDonationDialog = false;

    // pequeno delay para animação ficar suave
    setTimeout(async () => {
      await this.doExportPDF();
    }, 200);
  }

  async exportPDF(): Promise<void> {
    console.log(this.generatedCards.length);

    if (this.generatedCards.length < 1) {
      return;
    }
    await this.generatePixQrCode();

    this.showDonationDialog = true;
  }

  async doExportPDF(): Promise<void> {
    if (!this.generatedCards.length) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210,
      PH = 297;
    const margin = 12;
    const gap = 4;

    const layout = this.getLayoutConfig(this.generatedCards.length);
    const cpr = layout.colunas;
    const cpc = layout.linhas;
    const cpp = cpr * cpc;

    const larguraDisponivel = PW - margin * 2 - gap * (cpr - 1);
    const alturaDisponivel = PH - margin * 2 - gap * (cpc - 1);

    let larguraCarta = larguraDisponivel / cpr;
    let alturaCarta = alturaDisponivel / cpc;

    const tamanhoIdeal = Math.min(larguraCarta, alturaCarta);
    larguraCarta = tamanhoIdeal;
    alturaCarta = tamanhoIdeal;

    const larguraTotalCartelas = larguraCarta * cpr + gap * (cpr - 1);
    const alturaTotalCartelas = alturaCarta * cpc + gap * (cpc - 1);

    const offsetX = margin + (larguraDisponivel - larguraTotalCartelas) / 2;
    const offsetY = margin + (alturaDisponivel - alturaTotalCartelas) / 2;

    const pal = this.currentPalette;

    const hr = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    };

    let lionDataUrl: string | null = null;
    if (this.isLionSelected) {
      const cnv = document.createElement('canvas');
      cnv.width = 120;
      cnv.height = 120;
      this.drawLion(cnv);
      lionDataUrl = cnv.toDataURL('image/png');
    }
    const centerImg = this.customImage || lionDataUrl;

    for (let ci = 0; ci < this.generatedCards.length; ci++) {
      const pi = ci % cpp;
      if (pi === 0 && ci > 0) doc.addPage();

      const r = Math.floor(pi / cpr);
      const c = pi % cpr;

      const ox = offsetX + c * (larguraCarta + gap);
      const oy = offsetY + r * (alturaCarta + gap);

      const headerH = Math.max(9, alturaCarta * 0.12);
      const cellW = larguraCarta / this.cols;
      const cellH = (alturaCarta - headerH) / this.rows;

      const bgColor = hr(pal.bg);
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.roundedRect(ox, oy, larguraCarta, alturaCarta, 2, 2, 'F');

      const headerColor = hr(pal.header);
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.roundedRect(ox, oy, larguraCarta, headerH, 2, 2, 'F');
      doc.rect(ox, oy + headerH / 2, larguraCarta, headerH / 2, 'F');

      const headerTextColor = hr(pal.text);
      doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
      doc.setFont('helvetica', 'bold');
      const fontSizeHeader = Math.min(11, Math.max(8, headerH * 0.65));
      doc.setFontSize(fontSizeHeader);
      doc.text(`${this.titleBingo ?? 'BINGO'}`, ox + larguraCarta / 2, oy + headerH / 2 + 2, {
        align: 'center',
      });

      const midIdx = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);

      for (let i = 0; i < this.rows * this.cols; i++) {
        const ri = Math.floor(i / this.cols);
        const ci2 = i % this.cols;
        const cx = ox + ci2 * cellW;
        const cy2 = oy + headerH + ri * cellH;
        const even = (ri + ci2) % 2 === 0;
        const val = this.generatedCards[ci][i];
        const isMid = val === null;

        const cellBgColor = hr(isMid ? pal.header : even ? pal.cell1 : pal.cell2);
        doc.setFillColor(cellBgColor[0], cellBgColor[1], cellBgColor[2]);
        doc.rect(cx, cy2, cellW, cellH, 'F');

        const borderColor = hr(pal.border);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.1);
        doc.rect(cx, cy2, cellW, cellH, 'S');

        if (isMid && centerImg) {
          const marg2 = Math.max(1, Math.min(3, cellW * 0.05));
          doc.addImage(
            centerImg,
            'PNG',
            cx + marg2,
            cy2 + marg2,
            cellW - marg2 * 2,
            cellH - marg2 * 2,
          );
        } else if (!isMid) {
          const textColor = hr(pal.text);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFont('helvetica', 'bold');
          const fontSize = Math.min(16, Math.max(9, cellH * 0.55));
          doc.setFontSize(fontSize);
          doc.text(String(val), cx + cellW / 2, cy2 + cellH / 2 + 1.8, { align: 'center' });
        }
      }

      const borderColorFinal = hr(pal.header);
      doc.setDrawColor(borderColorFinal[0], borderColorFinal[1], borderColorFinal[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(ox, oy, larguraCarta, alturaCarta, 2, 2, 'S');
    }

    doc.save(`cartelas-bingo-${Date.now()}.pdf`);
  }
}
