import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges,
  ElementRef, ViewChild, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  type: 'job' | 'pro';
  radiusKm?: number;
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div #mapEl class="map-el"></div>
      <div *ngIf="markers.length === 0 && !loading" class="map-no-data">
        <span class="material-icons">location_off</span>
        <p>No location data available for these results</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; min-height: 400px; }
    .map-wrapper { position: relative; width: 100%; height: 100%; min-height: 400px; }
    .map-el { position: absolute; inset: 0; min-height: 400px; }
    .map-no-data {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(245,245,245,0.88);
      color: #888; gap: 10px;
      z-index: 1000; pointer-events: none;
    }
    .map-no-data .material-icons { font-size: 40px; }
    .map-no-data p { margin: 0; font-size: 14px; }
  `]
})
export class MapViewComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() markers: MapMarker[] = [];
  @Input() loading = false;
  @Input() highlightedId: number | null = null;
  @Output() markerClick = new EventEmitter<number>();

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layerGroup?: L.LayerGroup;
  private leafletMarkers = new Map<number, L.Marker>();

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Two rAF passes ensure the browser has painted the grid layout before Leaflet reads dimensions
    this.zone.runOutsideAngular(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.initMap())
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['markers']) {
      this.zone.runOutsideAngular(() => this.refreshMarkers());
    }
    if (changes['highlightedId']) {
      this.applyHighlight();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([20, 78], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.map);
    this.layerGroup = L.layerGroup().addTo(this.map);
    // Force dimension recalculation in case container was 0×0 at creation
    this.map.invalidateSize();
    if (this.markers.length > 0) this.refreshMarkers();
  }

  private refreshMarkers(): void {
    this.layerGroup?.clearLayers();
    this.leafletMarkers.clear();

    const validMarkers = this.markers.filter(m => m.lat && m.lng);
    if (validMarkers.length === 0) return;

    const bounds: [number, number][] = [];

    for (const m of validMarkers) {
      const icon = this.buildIcon(m.type, m.id === this.highlightedId);
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(this.buildPopup(m), { maxWidth: 220 });

      marker.on('click', () => {
        this.zone.run(() => this.markerClick.emit(m.id));
      });

      marker.addTo(this.layerGroup!);
      this.leafletMarkers.set(m.id, marker);
      bounds.push([m.lat, m.lng]);

      if (m.type === 'pro' && m.radiusKm) {
        L.circle([m.lat, m.lng], {
          radius: m.radiusKm * 1000,
          color: '#667eea',
          fillColor: '#667eea',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '6 4'
        }).addTo(this.layerGroup!);
      }
    }

    if (bounds.length === 1) {
      this.map!.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      this.map!.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 13 });
    }
  }

  private applyHighlight(): void {
    for (const [id, marker] of this.leafletMarkers) {
      const m = this.markers.find(x => x.id === id);
      if (!m) continue;
      const icon = this.buildIcon(m.type, id === this.highlightedId);
      marker.setIcon(icon);
    }
    if (this.highlightedId !== null) {
      const marker = this.leafletMarkers.get(this.highlightedId);
      const m = this.markers.find(x => x.id === this.highlightedId);
      if (marker && m) {
        this.map?.panTo([m.lat, m.lng]);
        marker.openPopup();
      }
    }
  }

  private buildIcon(type: 'job' | 'pro', highlighted: boolean): L.DivIcon {
    const baseColor = type === 'job' ? '#e91e63' : '#667eea';
    const color = highlighted ? '#ff9800' : baseColor;
    const size = highlighted ? 26 : 20;
    const border = highlighted ? 3 : 2;
    return L.divIcon({
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:${border}px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        transition:all .2s;
      "></div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2) - 4]
    });
  }

  private buildPopup(m: MapMarker): string {
    return `
      <div style="font-family:sans-serif;min-width:160px">
        <strong style="display:block;margin-bottom:4px">${m.title}</strong>
        ${m.subtitle ? `<span style="color:#666;font-size:12px">${m.subtitle}</span>` : ''}
        ${m.radiusKm ? `<br><span style="color:#667eea;font-size:11px">Service radius: ${m.radiusKm} km</span>` : ''}
      </div>`;
  }

  panTo(id: number): void {
    const m = this.markers.find(x => x.id === id);
    const marker = this.leafletMarkers.get(id);
    if (m && marker) {
      this.zone.runOutsideAngular(() => {
        this.map?.panTo([m.lat, m.lng]);
        marker.openPopup();
      });
    }
  }

  flyTo(lat: number, lng: number, zoom: number): void {
    this.zone.runOutsideAngular(() => {
      this.map?.setView([lat, lng], zoom, { animate: true });
    });
  }
}
