import { Component, OnInit } from '@angular/core';
import {FieldType} from '@ngx-formly/core';
import {BackendService} from 'ngt-gui/core';
@Component({
    selector: 'app-geolayer-selector',
    templateUrl: './geolayer-selector.component.html',
    styleUrls: ['./geolayer-selector.component.sass'],
    standalone: false
})
export class GeolayerSelectorComponent extends FieldType implements OnInit {
  geolayers = [];
  type: string;
  filename: string;
  selectedLayer: {};

  constructor(private readonly backendService: BackendService) {
    super();
  }

  ngOnInit(): void {
    this.type = this.props.extension;
    this.filename = this.props.filename;
    this.backendService.getLayerGIS().subscribe(
      response => {
        console.log(response["content"]);
        response["content"].forEach((layer: {}) => {
          this.geolayers.push({name: layer["name"], id: layer["id"]});
          if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
            if (layer['id'] == this.formControl.value[0]['selection']) {
              this.selectedLayer = this.geolayers[this.geolayers.length - 1];
            }
          }
        });
      });
  }



  selectLayer(event) {
    this.formControl.setValue([
      {
        remote_name: this.filename + '.' + this.type,
        selection: event["id"],
        object_type: {geo: 'layers'},
        queryParams: '',
        type: this.type
      }
    ]);
  }

}

