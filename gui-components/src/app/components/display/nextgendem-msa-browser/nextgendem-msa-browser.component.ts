import {AfterViewInit, Component, HostListener, Input, OnDestroy, ViewEncapsulation, Inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as d3 from 'd3';
import {FilesServiceInterface, FILES_SERVICE_TOKEN} from "ngt-gui/core";
import {MessageLogServiceInterface, MESSAGE_LOG_SERVICE} from "ngt-gui/core";
import { HttpClient } from "@angular/common/http";
import { GlobalServiceInterface, GLOBAL_SERVICE } from 'ngt-gui/core';
import {saveAs} from "file-saver";
import {BackendServiceInterface, BACKEND_SERVICE} from 'ngt-gui/core';
import {v4 as uuid} from 'uuid';
import {NotificationService} from "ngt-gui/core";
import {CommonModule, Location} from "@angular/common";
import {InternationalizationServiceInterface, INTERNATIONALIZATION_SERVICE} from "ngt-gui/core";
import {FormlyFieldConfig} from "@ngx-formly/core";
import { StateServiceInterface, STATE_SERVICE } from 'ngt-gui/core';
import {
  DynamicInputModalComponent
} from "ngt-gui/gui";
import { NOTIFICATION_SERVICE } from 'ngt-gui/core';
import { NotificationServiceInterface } from 'projects/ngt-gui/core';

const DEFAULT_MSA_VIEWER_HEIGHT = 1145;
const DEFAULT_MSA_VIEWER_WIDTH = 1848;

const IUPAC_CODES = {
  'R': 'AG',
  'Y': 'CT',
  'S': 'CG',
  'W': 'AT',
  'K': 'GT',
  'M': 'AC',
  'B': 'CGT',
  'D': 'AGT',
  'H': 'ACT',
  'V': 'ACG',
  'N': 'ACGT'
}

const COLORS = [
  '#FF6384', // Pinkish Red
  '#36A2EB', // Sky Blue
  '#FFCE56', // Yellow
  '#4BC0C0', // Turquoise
  '#9966FF', // Soft Purple
  '#FF9F40', // Orange
  '#FFCD56', // Gold
  '#4DBEA9', // Sea Green
  '#605ca8', // Indigo
  '#d81b60', // Crimson
  '#00d2d3', // Bright Turquoise
  '#f012be', // Magenta
  '#6f42c1', // Lavender
  '#01FF70', // Neon Green
  '#39CCCC', // Teal
  '#85144b', // Maroon
  '#3D9970', // Olive
  '#FF851B', // Tangerine
  '#B10DC9', // Purple
  '#000000'  // Black
]
@Component({
    selector: 'app-nextgendem-msa-browser',
    imports: [
        CommonModule,
        DynamicInputModalComponent,
    ],
    templateUrl: './nextgendem-msa-browser.component.html',
    styleUrls: ['./nextgendem-msa-browser.component.sass'],
    encapsulation: ViewEncapsulation.None
})
export class NextgendemMsaBrowserComponent implements AfterViewInit, OnDestroy {

  @Input('Url') Url: string;
  @Input('analysis_id') analysis_id: number;
  @Input('view_id') idView: number;
  @Input('barcoding_positions') barcodingPositions = {};
  @Input('barcoding_groups') private seqs_groups = {};
  private barcodingColumns: number[] = [];
  private barcodingGroups: string[] = [];
  public loading: boolean;
  public initLoading: boolean;
  public updating: boolean;
  private new_data: {}[];
  private preventKeydown = false;
  private view: {};
  private getState;
  private canvasBlob: Blob;


  //MODAL
  isVisibleModal = false;
  modalTitle = ''
  modalFields: FormlyFieldConfig[];
  saveFunction: Function;

  constructor(
    private readonly route: ActivatedRoute,
    @Inject(MESSAGE_LOG_SERVICE) private readonly msg: MessageLogServiceInterface,
    private readonly http: HttpClient,
    @Inject(GLOBAL_SERVICE) private readonly globalVariablesServices: GlobalServiceInterface,
    @Inject(BACKEND_SERVICE) private readonly backendService: BackendServiceInterface,
    @Inject(FILES_SERVICE_TOKEN) private readonly fileService: FilesServiceInterface,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: NotificationServiceInterface,
    @Inject (INTERNATIONALIZATION_SERVICE) private readonly internationalizationService: InternationalizationServiceInterface,
    private location: Location,
    @Inject(STATE_SERVICE) private readonly stateService: StateServiceInterface,
  ) {
    this.initLoading = true;
    this.updating = false;
  }

  ab2str(buf) {
    let str = "";
    for (let i = 0; i < buf.length; i++) {
      str += buf[i];
    }
    return str;
  }

  str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  @HostListener('window:beforeunload')
  ngOnDestroy(): void {
    //Avoid body listeners
    d3.select("body")
          .on("keydown", () => {})
          .on("click", () => {});

    //Save state
    const fasta_str = this.dump_fasta(this.new_data);
    const filename = uuid() + ".fasta";
    const contentType = "text/x-fasta"
    d3.select('.loader').style('visibility', 'visible');
    if (this.analysis_id) {
      this.getState.analysis[this.analysis_id] = {
        view: this.view,
        fasta: filename,
        analysis_id: this.analysis_id
      }
    } else if (this.idView) {
      this.getState.views[this.idView] = {
        view: this.view,
        fasta: filename,
        analysis_id: this.analysis_id
      }
    }
    this.stateService.setStateCurrentView(this.getState);
    this.fileService.postString2FileApi('msa_editor', filename, fasta_str, contentType).subscribe();
  }

  dump_fasta(parsed_fasta: {}[]): string {
      var fasta = "";
      for(var f of parsed_fasta) {
        fasta += ">" + f['key'] + "\n";
        fasta += f['value'].join("") + "\n";
      }
      return fasta.slice(0,-1);
    }

  async ngAfterViewInit() {
    const fileService = this.fileService;
    this.modalFields = [
      {
        key: 'name',
        type: 'input',
        props: {
          required: true,
          label: await this.internationalizationService.translate("MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_MODAL.NAME"),
        }
      }
    ];
    this.getState = await this.stateService.getStateCurrenView();
    if (this.getState &&
      (this.getState.analysis && this.analysis_id ||
        this.getState.views && this.idView)) {
      let state;
      if (this.analysis_id) {
        state = this.getState.analysis[this.analysis_id];
      } else {
        state = this.getState.views[this.idView];
      }
      //TODO: if false
      if (false && state) {
        this.view = state.view;
        this.Url = `${this.fileService.baseUrl}/files/msa_editor/${state.fasta}.content`;
        this.analysis_id = state.analysis_id;
      }
    } else if (this.idView) {
      const response = await this.backendService.getViewers(this.idView).toPromise();
      if (response['issues'].length !== 0) {
        this.msg.addIssues(response['issues']);
      }
      this.view = response['content'];
      this.Url = `${this.fileService.baseUrl}/files/msa_editor/${this.view['data']['fasta']}.content`;
      this.analysis_id = this.view['data']['analysis_id'];
      this.getState = {
        analysis: {},
        views: {},
      };
    } else {
      this.getState = {
        analysis: {},
        views: {},
      };
    }

    ///////////////////////////////////////////
    // UTILITY FUNCTIONS

    let calculate_iupac_code = function(nucl1: string, nucl2: string) {
      const nucls: Set<string> = new Set();
      for (let nucl of [nucl1, nucl2]) {
        if (Object.keys(IUPAC_CODES).includes(nucl)) {
          IUPAC_CODES[nucl].split('').forEach((v: string) => {
            nucls.add(v)
          });
        } else {
          nucls.add(nucl)
        }
      }

      const nucleotides = [...nucls].sort().join('');
      let new_iupac = ''
      if (nucleotides.length === 1) {
        new_iupac = nucleotides;
      }
      else {
        Object.keys(IUPAC_CODES).forEach((k) => {
          if (IUPAC_CODES[k] === nucleotides) {
            new_iupac = k;
          }
        });
      }
      return new_iupac;
    }

    function isArrayInArray(arrays: any[][], target: any[]): boolean {
      return arrays.some(subArray =>
          subArray.length === target.length &&
          subArray.every((element, index) => element === target[index])
      );
  }

    // Shuffles the input array.
    let parse_fasta = function (s: string): {}[] {
      var lines = s.split('\n');
      var parsed_fasta: {}[] = []
      let index = 0;
      let group_keys = [];
      let current_groups = [];
      let line = '';
      for (var i = 0; i < lines.length; i++) {
        line = lines[i].trim();
        if (line.startsWith('>') && !this.barcodingColumns.length) {
          parsed_fasta.push({key: line.substring(1), value: []/*[lines[i].substring(1)]*/});
          index = 0;
        }
        else if (line.startsWith('>') && this.barcodingColumns.length) {
          index = 0;
          let seq_key = line.substring(1);
          if (seq_key.includes('|')) {
            seq_key = seq_key.split('|')[0]
          }
          current_groups = [];
          Object.keys(this.seqs_groups).forEach((k) => {
            if (this.seqs_groups[k].includes(seq_key)) {
              current_groups.push(k);
              if (!group_keys.includes(k)) {
                group_keys.push(k);
                parsed_fasta.push({key: k, value: []});
              }
            }
          });
          if (!isArrayInArray(this.barcodingGroups, current_groups)) {
            this.barcodingGroups.push(current_groups);
          }
        }
        else if (line && this.barcodingColumns.length > 0) {
          for (let current_group of current_groups) {
            let nucls = [];
            let group_index = group_keys.indexOf(current_group);
            let j = 0;
            for (let col of this.barcodingColumns) {
              if (col - 1 >= index && col <= index + line.length) {
                if (parsed_fasta[group_index]['value'].length < this.barcodingColumns.length) {
                  nucls.push(line.charAt(col - index - 1).toUpperCase());
                } else {
                  let new_iupac = calculate_iupac_code(
                    line.charAt(col - index - 1).toUpperCase(),
                    parsed_fasta[group_index]['value'][j]);
                  parsed_fasta[group_index]['value'][j] = new_iupac;
                }
              }
              j++;
            }
            if (parsed_fasta[group_index]['value'].length < this.barcodingColumns.length)
              parsed_fasta[group_index]['value'] = parsed_fasta[group_index]['value'].concat(nucls);
          }
          index += line.length;
        }
        else if (line) {
          parsed_fasta[parsed_fasta.length - 1]['value'] = parsed_fasta[parsed_fasta.length - 1]['value'].concat(line.split('').map(function(x) { return x.toUpperCase(); }));
        }
      }
      return parsed_fasta;
    }

    parse_fasta = parse_fasta.bind(this);



    function put_gap(parsed_aln: {}[], index: number, key: string): {}[] {
      for (var i = 0; i < parsed_aln.length; i++) {
        if (parsed_aln[i]['key'] == key) {
          parsed_aln[i]['value'].splice(index, 0, "-");
          return parsed_aln;
        }
      }
      return [];
    }

    function delete_pos(parsed_aln: {}[], index: number, key: string): {}[] {
      for (var i = 0; i < parsed_aln.length; i++) {
        if (parsed_aln[i]['key'] == key) {
          parsed_aln[i]['value'].splice(index, 1);
          return parsed_aln;
        }
      }
      return [];
    }

    function delete_column(parsed_aln: {}[], index: number): {}[] {
      if (index >= 0) {
        for (var i = 0; i < parsed_aln.length; i++) {
          if (parsed_aln[i]['value'].length > index)
            parsed_aln[i]['value'].splice(index, 1);
        }
      }
      return parsed_aln;
    }

    function delete_gappy_columns(parsed_aln: {}[], aln_length: number) {
      let allGaps: boolean;
      for (let i = aln_length - 1; i > 0; i--) {
        allGaps = true;
        for (let seq of parsed_aln) {
          if (seq['value'].length > i) {
            allGaps = allGaps && seq['value'][i] === '-';
            if (!allGaps) { break; }
          }
        }
        if (allGaps) {
          parsed_aln = delete_column(parsed_aln, i);
        }
      }
      return parsed_aln;
    }

    function delete_taxon(parsed_aln: {}[], taxon: string) {
      for (const [i, seq] of parsed_aln.entries()) {
        if (seq['key'] == taxon) {
          parsed_aln.splice(i, 1);
          break;
        }
      }
      return parsed_aln;
    }

    function change_cell_content(parsed_aln: {}[], index: number, key: string, new_char: string): {}[] {
      for (var i = 0; i < parsed_aln.length; i++) {
        if (parsed_aln[i]['key'] == key) {
          parsed_aln[i]['value'][index] = new_char;
          return parsed_aln;
        }
      }
      return [];
    }

    var post_states: string[] = [];
    var prev_states: string[] = [];
    function insert_state(parsed_aln_str: string, states: string[]) {
      if (states.length > 5) {
        states.splice(0, 1);
      }
      states.push(parsed_aln_str);
    }

    const complement_map = {
      "A": "T",
      "G": "C",
      "C": "G",
      "T": "A",
      "R": "Y",
      "Y": "R",
      "S": "W",
      "W": "S",
      "K": "M",
      "M": "K",
      "B": "V",
      "V": "B",
      "H": "D",
      "D": "H"
    };

    var complement = function(seq: string[]) {
      for (var i = 0; i < seq.length; i++) {
        if (seq[i] in complement_map)
          seq[i] = complement_map[seq[i]]
      }
      return seq;
    }

    /////////////////////////////////////////////
    // DEFINE HELPER FUNCTIONS
    // Extract key from key-value object.
    var get_key = function(d) {
      return d && d.key;
    };

    // Extract data from a key-value object.
    // Prepend the key so it is the first item in the values array.
    var extract_row_data = function(d) {
      var row_data: {}[] = [];
      var values = d.value.slice();
      for (var i = 0; i < values.length; i++) {
        row_data.push({key: d.key, nucl: values[i], pos: (i+1).toString()})
      }
      return row_data;

    };

    function get_intermediate_nucls(new_data, new_select, nearest_selected) {
      var bigger_idx = +new_select['idx'] > +nearest_selected['idx'] ? +new_select['idx'] : +nearest_selected['idx']
      var bigger_pos = +new_select['pos'] > +nearest_selected['pos'] ? +new_select['pos'] : +nearest_selected['pos']
      var smaller_idx = +new_select['idx'] < +nearest_selected['idx'] ? +new_select['idx'] : +nearest_selected['idx']
      var smaller_pos = +new_select['pos'] < +nearest_selected['pos'] ? +new_select['pos'] : +nearest_selected['pos']

      delete new_select['idx']
      delete nearest_selected['idx']

      var new_selected_block: {}[] = [];
      var nucl = {};
      for (var i = smaller_idx; i <= bigger_idx; i++) {
        for (var j = smaller_pos; j <= bigger_pos; j++) {
          nucl = {
            'key': new_data[i]['key'],
            'nucl': new_data[i]['value'][j - 1],
            'pos': j.toString()
          }
          if (JSON.stringify(nucl) !== JSON.stringify(new_select) && JSON.stringify(nucl) !== JSON.stringify(nearest_selected)) {
            new_selected_block.push(nucl);
          }
        }
      }
      return new_selected_block;
    }

    function shift_clicked_nucls(new_data: [], selected_nucls: {}[], new_select: {}) {
      var shift_clicked:  {}[] = [];
      if (selected_nucls.length > 0) {
        for (var i = 0; i < selected_nucls.length; i++) {
          for (var j = 0; j < new_data.length; j++) {
            if(new_select['key'] == new_data[j]['key']) {
              new_select['idx'] = j;
            }
            if (selected_nucls[i]['key'] == new_data[j]['key']) {
              selected_nucls[i]['idx'] = j;
              if (Object.keys(new_select).includes('idx'))
                break;
            }
          }
        }

        var nearest_selected = selected_nucls[0]
        for (var i = 1; i < selected_nucls.length; i++) {
          if (Math.abs(nearest_selected['idx'] - new_select['idx']) >= (Math.abs(selected_nucls[i]['idx'] - new_select['idx']))) {
            if (Math.abs(+nearest_selected['pos'] - +new_select['pos']) > (Math.abs(+selected_nucls[i]['pos'] - +new_select['pos']))) {
              nearest_selected = selected_nucls[i]
            }
          }
        }
        shift_last_clicked = true;
        shift_clicked = get_intermediate_nucls(new_data, new_select, nearest_selected).concat([nearest_selected]);
      }
      return shift_clicked;
    }

    /////////////////////////////////////////////
    // UPDATE THE TABLE

    // Select the table element
    var x_bar_pos = -1;
    var x_start_pos = -1;
    var y_bar_pos = -1;
    var y_start_pos = -1;
    var dragged_key = "";
    var cursor_pos = "";
    var cursor_key = "";
    var edit_keys: {}[] = [];
    var i_search = 0;
    var found_searches: {}[] = [];
    var search_params: string[] = [];
    var shift_last_clicked = false;
    var aln_length = 0;
    var overview_bar_x = 0;
    var overview_bar_y = 0;
    var overview_x_start = 0;
    var overview_y_start = 0;
    var fix_overview = false;
    var no_move = false;
    var force_update_bar = false;

    var margin = {top: 75, right: 20, bottom: 117.5, left: 200};

    // Put forms
    var schema = {
      go_to_form: [
          {name: 'seq_key', type: 'select', placeholder: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.SEQUENCE_KEY'},
          {name: 'seq_pos', type: 'number', placeholder: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.POSITION'}
      ],
      motif_form: [
        {name: 'motif', type: 'text', placeholder: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.MOTIF'},
        {name: 'motif', type: 'checkbox', placeholder: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.COMPLEMENT'},
        {name: 'motif', type: 'checkbox', placeholder: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.INVERSE'},
      ]
    };

    var get_type = (d) => d['type'];
    var get_placeholder = async (d) => await this.internationalizationService.translate(d['placeholder']);
    get_placeholder = get_placeholder.bind(this)

    d3.select("#browser")
      .append("text")
      .attr("id", "title")
      .attr("class", "nextgendem-msa")
      .style("margin-left", "10px")
      .style("font-size", "40px")
      .text("NEXTGENDEM MSA EDITOR");

    var select = d3.select("#browser")
      .append("select")
      .attr("id", "saveSelect")
      .style("position", "absolute")
      .style("top", "70px")
      .style("left", "5px")
      .style("width", "178px")
      .style("padding", "1px 2px")
      .style("font-size", "20px")

    var save_options = [
      {"value": "svg", "text": "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_OPTIONS.SVG_IMAGE"},
    ]
    console.log(Object.keys(this.barcodingPositions).length)
    if (Object.keys(this.barcodingPositions).length === 0) {
      save_options = save_options.concat([
        {"value": "fasta", "text": "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_OPTIONS.FASTA"},
        {"value": "view", "text": "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_OPTIONS.VIEW"},
        {"value": "alignment", "text": "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_OPTIONS.ALN"},
        {"value": "overview", "text": "Overview PNG"}
      ]);
    }

    if (this.analysis_id >= 0 && Object.keys(this.barcodingPositions).length === 0) {
      save_options.push({"value": "version", "text": "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_OPTIONS.VERSION"})
    }

    for (var o of save_options) {
      select.append("option")
          .attr("value", o["value"])
          .text(await this.internationalizationService.translate(o["text"]))
    }

    d3.select("#browser")
      .append("button")
      .attr("id", "saveButton")
      .style("position", "absolute")
      .style("top", "105px")
      .style("left", "43px")
      .style("font-size", "16px")
      .style("padding", "0px 30px")
      .text(await this.internationalizationService.translate('MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.SAVE'));

    if (Object.keys(this.barcodingPositions).length === 0) {
      d3.select("#browser")
        .append("vl")
        .style("position", "absolute")
        .style("left", (margin.left - 5) + "px")
        .style("top", margin.top + "px")
        .style("height", (margin.top * 2 - 30) + "px")
        .style("border-left", "1px solid grey")


      d3.select("#browser")
        .append("div")
        .attr("title", await this.internationalizationService.translate("MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.N_NUCLEOTIDES_ARROWS"))
        .append("input")
        .attr("id", "scroll_num")
        .style("position", "absolute")
        .style("top", "-15px")
        .style("font-size", "20px")
        .attr("type", "number")
        .style("text-align", "left")
        .style("width", "70px")
        .attr("value", 50);

      d3.select("#browser")
        .append("i")
        .style("position", "absolute")
        .style("left", "688px")
        .style("cursor", "pointer")
        .attr("class", "nextgendem-msa arrow left")
        .attr("value", 1);

      d3.select("#browser")
        .append("i")
        .style("position", "absolute")
        .style("cursor", "pointer")
        .attr("class", "nextgendem-msa arrow right")
        .attr("value", 1);

      d3.select("#browser")
        .append("i")
        .style("position", "absolute")
        .style("top", "5px")
        .style("cursor", "pointer")
        .attr("class", "nextgendem-msa arrow up")
        .attr("value", 1);

      d3.select("#browser")
        .append("i")
        .style("position", "absolute")
        .style("cursor", "pointer")
        .attr("class", "nextgendem-msa arrow down")
        .attr("value", 1);

      var header_div = d3.select("#browser")
        .append("div")
        .attr("id", "header")
        .attr("class", "nextgendem-msa")
        .style("margin-left", margin.left + "px")
        .style("position", "absolute")
        .style("top", "50px")
        .style("left", "7px");

      var forms_div = header_div
        .append("div")
        .attr("id", "forms")
        .attr("class", "nextgendem-msa");

      var form = forms_div.append("form").attr("id", "go_to");

      var p = form.selectAll("p")
        .data(schema.go_to_form)
        .enter()
        .each(async function (d) {
          var self = d3.select(this);
          var placeholder = await get_placeholder(d)
          var input = self.append("input")
            .attr("type", d => get_type(d))
            .attr("placeholder", placeholder);

          if (get_type(d) == 'number') {
            input.attr("id", "go_to_pos");
          } else if (get_type(d) == 'select') {
            input.attr("list", "go_to_key")
              .attr("autocomplete", "off")
              .attr("id", "go_to_id");
          }
        });

      setTimeout(async () => {
        form.append("button")
          .attr('type', 'submit')
          .text(await this.internationalizationService.translate('MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.GO'));
      }, 50)

      setTimeout(async () => {
        var form = forms_div
          .append("form")
          .attr("id", "motif");

        var p = form.selectAll("p")
          .data(schema.motif_form)
          .enter()
          .each(async function (d) {
            var self = d3.select(this);
            var placeholder = await get_placeholder(d);
            if (get_type(d) == 'checkbox') {
              self.append("label")
                .text(placeholder)
                .style("display", "inline-block");
            }
            self.append("input")
              .attr("type", d => get_type(d))
              .attr("id", d.type)
              .attr("placeholder", placeholder);
          });
        setTimeout(async () => {
          form.append("button").attr('type', 'submit')
            .text(await this.internationalizationService.translate('MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.NEXT'));
        }, 50)
      }, 50);


      var info_div = d3.select('#browser')
        .append("div")
        .attr("id", "info")
        .attr("class", "nextgendem-msa");

      var cursor_key_label = await this.internationalizationService.translate('MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.CURSOR_KEY');
      var cursor_pos_label = await this.internationalizationService.translate('MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.HEADER_STRINGS.CURSOR_POS');
      info_div
        .append("label")
        .attr("id", "cursor_key")
        .style("font-size", "12px")
        .text(`${cursor_key_label}: ${cursor_key}`);

      info_div
        .append("label")
        .attr("id", "cursor_pos")
        .style("font-size", "12px")
        .text(`${cursor_pos_label}: ${cursor_pos}`);
    }


    // Define function to update data
    var update = function() {
      // HELPER FUNCTIONS
      if (!this.updating) {
        this.updating = true;
        if (!this.initLoading)
          d3.select('.loader').style('visibility', 'visible');
        d3.select('body').style('cursor', 'inherit !important');//Disables all cursor overrides when body has this class.

        var x_pos = function (d, x) {
          return x(d.pos);
        }

        var y_pos = function (d, y) {
          return y(d.key);
        }

        var cell_color = function (d, c) {
          return c(d.nucl);
        }

        var cell_text = function (d) {
          return d.nucl;
        }

        var cell_key = function (d) {
          return d.key;
        }

        var parse_key = function (s) {
          return s.replaceAll("[", "{").replaceAll("]", "}").replaceAll("'", "").replaceAll('"', '');
        }

        var parsed_cell_key = function (d) {
          return parse_key(d.key);
        }

        var cell_index = function (d) {
          return d.pos;
        }

        //Download fasta button

        const download = (modalOutput: any[]) => {
          fileService.convertStringToDownloadFile(`${modalOutput['name']}.fasta`, this.dump_fasta(this.new_data), 'text/x-fasta');
        }

        async function import_view(modalOutput: any[]) {
          let view_name = modalOutput['name']
          const fasta_str = this.dump_fasta(this.new_data);
          const filename = uuid() + ".fasta";
          const contentType = "text/x-fasta"
          d3.select('.loader').style('visibility', 'visible');
          await fileService.postString2FileApi('msa_editor', filename, fasta_str, contentType).subscribe(
            response => {
            }, async error => {
              await this.notificationService.createNotificationWithType(
                'error',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_ERROR.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_ERROR.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            }, async () => {
              if (this.view) {
                await this.notificationService.createNotificationWithType(
                  'success',
                  'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_CORRECTLY.TITLE',
                  'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_CORRECTLY.CONTENT',
                  'bottomRight'
                ).then();
                d3.select('.loader').style('visibility', 'hidden');
              }
            });
          if (!this.view) {
            try {
              this.view = {
                name: view_name,
                type: 'msa-editor',
                data: {fasta: filename, analysis_id: this.analysis_id}
              };
              const response: any = await this.backendService.postView(this.view).toPromise();
              if (response.content && response.content.id) {
                this.idView = response.content.id;
                this.location.replaceState(`/nextgendemMsaBrowser?view_id=${this.idView}`);
              }
              if (response.issues) {
                this.msg.addIssues(response.issues);
              }
              await this.notificationService.createNotificationWithType(
                'success',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_CORRECTLY.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_CORRECTLY.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            } catch (e) {
              if (e.issues) {
                this.msg.addIssues(e.issues);
              }
              await this.notificationService.createNotificationWithType(
                'error',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_ERROR.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.SAVE_VIEW.NOTIFICATION_CREATE_VIEW_ERROR.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            }
          }
        }

        function download_svg(modalOutput: any[]) {
          const filename = modalOutput['name'] + '.svg';
          let svg_select = document.getElementById("alignment_view")!;
          let svgAlignment = "";
          if (typeof window.XMLSerializer !== 'undefined') {
            svgAlignment = (new XMLSerializer()).serializeToString(svg_select);
          }
          saveAs(new Blob([decodeURIComponent(encodeURIComponent(svgAlignment))], {type: "application/svg+xml"}), filename);
        }

        function download_overview_png(modalOutput: any[]) {
          if (this.canvasBlob)
            saveAs(this.canvasBlob, modalOutput['name'] + '.png');
        }

        async function new_version() {
          d3.select('.loader').style('visibility', 'visible');
          const blob = new Blob([this.dump_fasta(this.new_data)], {type: 'text/plain'});
          const file = new File([blob], 'msa-editor', {type: "text/plain"});
          const params = {
            program: 'Nextgendem MSA',
            programversion: '1.0'
          }
          this.backendService.putAlignments(this.analysis_id, file, params).subscribe(
            response => {
              this.analysis_id = response['content'][0]['analysis_id'];
              this.msg.addIssues(response['issues']);
            }, error => {
              this.msg.addIssues(error['issues']);
              this.notificationService.createNotificationWithType(
                'error',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_VERSION.NOTIFICATION_IMPORT_VERSION_ERROR.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_VERSION.NOTIFICATION_IMPORT_VERSION_ERROR.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            }, () => {
              this.notificationService.createNotificationWithType(
                'success',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_VERSION.NOTIFICATION_IMPORT_VERSION_CORRECTLY.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_VERSION.NOTIFICATION_IMPORT_VERSION_CORRECTLY.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            });
        }

        function new_alignment(modalOutput: any[]) {
          d3.select('.loader').style('visibility', 'visible');
          const blob = new Blob([this.dump_fasta(this.new_data)], {type: 'text/plain'});
          const file = new File([blob], 'msa-editor', {type: "text/plain"});
          let name = modalOutput['name']//saveName.property("value")
          const params = {
            program: 'Nextgendem MSA',
            programversion: '1.0',
            name: name,
            algorithm: null,
            description: null
          };
          this.backendService.importAlignments([file], params).subscribe(
            response => {
              this.analysis_id = response['content'][0]['analysis_id'];
              this.msg.addIssues(response['issues']);
            }, error => {
              this.msg.addIssues(error['issues']);
              this.notificationService.createNotificationWithType(
                'error',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_ALN.NOTIFICATION_IMPORT_ALN_ERROR.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_ALN.NOTIFICATION_IMPORT_ALN_ERROR.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            }, () => {
              let select = d3.select('#saveSelect');
              if (select['_groups'][0][0].length < 5) {
                select.append("option").attr("value", "version").text("Import Version")
              }
              this.notificationService.createNotificationWithType(
                'success',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_ALN.NOTIFICATION_IMPORT_ALN_CORRECTLY.TITLE',
                'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.IMPORT_ALN.NOTIFICATION_IMPORT_ALN_CORRECTLY.CONTENT',
                'bottomRight'
              ).then();
              d3.select('.loader').style('visibility', 'hidden');
            });
        }

        var save_select_click = async function () {
          const selectValue = d3.select("#saveSelect").property("value")
          if (selectValue == "svg") {
            this.saveFunction = download_svg;
            this.isVisibleModal = true;
            this.modalTitle = await this.internationalizationService.translate("DOWNLOAD_SVG");

          } else if (selectValue == "fasta") {
            this.saveFunction = download;
            this.isVisibleModal = true;
            this.modalTitle = await this.internationalizationService.translate("DOWNLOAD_FASTA");
          } else if (selectValue == "view") {
            if (this.view) {
              import_view.call(this, [this.view.name]);
            } else {
              this.modalTitle = await this.internationalizationService.translate("IMPORT_VIEW");
              this.saveFunction = import_view.bind(this);
              this.isVisibleModal = true;
            }
          } else if (selectValue == "version") {
            new_version.call(this);
          } else if (selectValue == "alignment") {
            this.modalTitle = await this.internationalizationService.translate("IMPORT_NEW_ALIGNMENT");
            this.saveFunction = new_alignment.bind(this);
            this.isVisibleModal = true;
          } else if (selectValue == "overview") {
            this.modalTitle = "Overview PNG";
            this.saveFunction = download_overview_png.bind(this);
            this.isVisibleModal = true;
          }
        }

        d3.select("#saveButton").on("click", save_select_click.bind(this));

        //Initialize list of go to form and sizes
        var go_to_list = d3.select("#go_to")
          .append("datalist")
          .attr("id", "go_to_key")


        var n = this.new_data.length;
        var new_aln_length = 0;
        var length_difference = 0;

        for (var s of this.new_data) {
          if (s['value'].length > new_aln_length) {
            new_aln_length = s['value'].length;
          }
          go_to_list.append("option")
            .attr("value", s['key']);
        }

        if (aln_length > 0 && x_bar_pos > margin.left) {
          length_difference = aln_length - new_aln_length;
        }

        aln_length = new_aln_length;
        d3.select("input.input_number").attr("min", 1).attr("max", aln_length)

        var height_proportion = innerHeight / DEFAULT_MSA_VIEWER_HEIGHT;
        var width_proportion = innerWidth / DEFAULT_MSA_VIEWER_WIDTH;

        var side_proportion = Math.min(width_proportion, height_proportion)
        var square_side_length = Math.round(23 * side_proportion);
        var square_margin = 1;

        var width = square_margin * 2 * (aln_length -1 ) + square_side_length *  aln_length,
          height = square_margin * 2 * (n - 1) + square_side_length * n;

        var max_x_start_pos = width - width_proportion;
        var max_y_start_pos = height - height_proportion;

        if (x_start_pos > max_x_start_pos)
          x_start_pos = max_x_start_pos;

        if (y_start_pos > max_y_start_pos)
          y_start_pos = max_y_start_pos;

        var position_size = square_margin * 2 + square_side_length;
        var max_svg_width = 1750 * width_proportion;
        var svg_width = margin.left * 2 + margin.right;
        while (svg_width + position_size < max_svg_width) {
          svg_width += position_size;
        }
        var max_svg_height = 1006 * height_proportion;
        var svg_height = margin.top * 2 + margin.bottom;
        while (svg_height + position_size < max_svg_height) {
          svg_height += position_size;
        }

        var update_bar = length_difference != 0 || force_update_bar;
        force_update_bar = false;
        var dragging = {};

        // SCALES
        var keys = this.new_data.map(d => get_key(d));
        var y = d3.scaleBand()
          .domain(keys)
          .range([margin.top, height + margin.top]);

        var x = d3
          .scaleLinear()
          .domain([0, aln_length])
          .range([margin.left, width + margin.left]);

        var c = d3
          .scaleOrdinal(['#009f3d', '#000000', '#0085c7', '#df0024', "#B4AABC", "#B4AABC"])
          .domain(['A', 'G', 'C', 'T', "-", "D"])
          .unknown("#FFFFFF");

        var selected_c = d3
          .scaleOrdinal(['#33D270', '#444444', '#33B8FA', '#ff5579', "#dddddd"])
          .domain(['A', 'G', 'C', 'T', "-"])
          .unknown("#DDDDDD");

        var motif_color = "#EAAA00";
        var sel_motif_color = "#FFCC22";

        var alignment_width = svg_width - margin.left * 2 - margin.right;
        var alignment_height = svg_height - margin.top * 2 - margin.bottom
        /*if (y(this.new_data[this.new_data.length - 1]['key'])! < svg_height)
          alignment_height = this.new_data.length * y.bandwidth() - margin.top * 2 - margin.bottom;*/
        var grid_right_border_pos = alignment_width - alignment_width / width * alignment_width;

        if (!no_move) {

          if (y_bar_pos < 0)
            y_bar_pos = margin.top

          if (!update_bar) {
            var y_bar_height =  alignment_height - (alignment_height / height * alignment_height)
            y_start_pos = (y_bar_pos - margin.top) * (height + margin.top - alignment_height) / y_bar_height
          }


          if (x_bar_pos < 0)
            x_bar_pos = x(0)

          if (!update_bar) {
            var x_bar_width = alignment_width - (alignment_width / width * alignment_width)
            x_start_pos = (x_bar_pos - margin.left) * (width + margin.left + margin.right - alignment_width) / x_bar_width;
          }


        }
        no_move = false;

        // Add listeners to forms
        var update_bar_pos = function (x_start_pos, y_start_pos) {
          var bar_width = alignment_width - (alignment_width / width * alignment_width)
          var bar_height =  alignment_height - (alignment_height / height * alignment_height)
          y_bar_pos = Math.max(margin.top, Math.min(y_start_pos * bar_height / (height + margin.top - alignment_height) + margin.top, bar_height + margin.top));
          //x_bar_pos = Math.max(x(0), Math.min(bar_width * x_start_pos / (width + x(0) - alignment_width) + x(0), bar_width + x(0)));
          x_bar_pos = bar_width * x_start_pos / (width + x(0) - alignment_width ) + x(0);
        }

        if (update_bar) {
          update_bar_pos(x_start_pos, y_start_pos);
        }

        var go_to_submit = function (event, d) {
          event.preventDefault();
          var values: string[] = [];
          d3.select("form#go_to")
            .selectAll("input")
            .each(function () {
              values.push(d3.select(this).property("value"))
            })
          if (values[0] && values[1]) {
            x_start_pos = x(+values[1]);
            y_start_pos = y(values[0])!;
          } else if (values[0]) {
            y_start_pos = y(values[0])!;
          } else if (values[1]) {
            x_start_pos = x(+values[1])
          }
          d3.select("#overview").remove();
          edit_keys = []
          svg.remove();
          force_update_bar = true;
          update.call(this);
          var transition_select;
          if (values[0] && values[1]) {
            transition_select = d3.select("[id='" + parse_key(values[0]) + "'].column.p" + (+values[1] - 1))
          } else if (values[0]) {
            transition_select = d3.selectAll("[id='" + parse_key(values[0]) + "'].column");
          } else if (values[1]) {
            transition_select = d3.selectAll(".column.p" + (+values[1] - 1));
          }
          transition_select.transition()
            .duration(0)
            .style("filter", "brightness(70%)")
            .transition().duration(2500)
            .style("filter", "brightness(100%)");
        }

        d3.select("form#go_to")
          .on("submit", go_to_submit.bind(this));
        var motif_on_submit = function (event, d) {
          event.preventDefault();
          var values: string[] = [];
          d3.select("form#motif")
            .selectAll("input#text")
            .each(function () {
              values.push(d3.select(this).property("value").toUpperCase())
            })
          d3.select("form#motif")
            .selectAll("input#checkbox")
            .each(function () {
              values.push(d3.select(this).property("checked"))
            })
          var i = 0
          var seq, seq_str, pos;

          if (search_params.join() != values.join()) {
            search_params = values;
            i_search = 0
            var new_search = true;
            found_searches = [];
          } else {
            new_search = false;
          }

          while (i < this.new_data.length && new_search) {
            seq = this.new_data[i]["value"];
            if (values[1])
              seq = complement([...seq]);
            if (values[2])
              seq = [...seq].reverse();
            seq_str = seq.join("");
            pos = seq_str.indexOf(values[0]);
            if (pos !== -1) {
              if (values[2])
                pos = this.new_data[i]["value"].length - pos - values[0].length;
              found_searches.push({"idx": i, "pos": pos, "key": this.new_data[i]['key']});
            }
            i++;
          }
          if (found_searches.length > 0) {
            pos = found_searches[i_search]["pos"];
            var key = this.new_data[found_searches[i_search]["idx"]]["key"];
            x_start_pos = x(pos + 1);
            y_start_pos = y(key)!;
            force_update_bar = true;
            i_search = (i_search + 1) % found_searches.length;
            d3.select("#overview").remove();
            edit_keys = []
            svg.remove();
            update.call(this);
          }
        }

        d3.select("form#motif")
          .on("submit", motif_on_submit.bind(this))

        //START SVG

        var svg = d3.select("#browser")
          .append("svg")
          .attr("id", "total_viewer")
          .attr("width", svg_width - margin.left)
          .attr("height", svg_height - margin.top)
          .style("position", "absolute")
          .style("top", margin.top + 110 + "px")
          .style("left", "0px");

        var first_row_key = "";
        var first_row_pos = Number.POSITIVE_INFINITY;

        var rows = svg
          .append("foreignObject")
          .attr("width", svg_width - margin.left - margin.right)
          .attr("height", svg_height - margin.top - margin.bottom)
          .append("svg")
          .attr("id", "alignment_view")
          .attr("width", svg_width - margin.left - margin.right)
          .attr("height", svg_height - margin.top - margin.bottom)
          .selectAll(".row")
          .data(this.new_data)
          .enter()
          .filter(function (d) {
            if (y_pos(d, y) >= y_start_pos && y_pos(d, y) < first_row_pos) {
              first_row_pos = y_pos(d, y);
              first_row_key = parsed_cell_key(d);
            }
            return y_pos(d, y) >= y_start_pos && y_pos(d, y) <= y_start_pos + (alignment_height + margin.top );//45 is the height of the rows of numbers
          })
          .append("g")
          .attr("class", "nextgendem-msa row");

        var y_pos_scroll = function (y_pos) {
          var margin_correction = first_row_pos - y_start_pos;
          return y_pos - y_start_pos + margin.top - margin_correction;
        }

        var text_cell_y_pos = function (text, y_pos) {
          if (text == '-')
            return y_pos_scroll(y_pos) + (y.bandwidth() - square_margin) / (1.50 * (Math.abs(height_proportion - side_proportion) + 1))
          else if (text == '.')
            return y_pos_scroll(y_pos) + (y.bandwidth() - square_margin) / (1.75 * (Math.abs(height_proportion - side_proportion) + 1))
          else
            return y_pos_scroll(y_pos) + (y.bandwidth() - square_margin) / (1.40 * (Math.abs(height_proportion - side_proportion) + 1))
        }

        var drag_text_cell_y_pos = function (text, y_pos) {
          if (text == '-')
            return (y_pos + y.bandwidth() / 5 - square_margin) / (1.50 * (Math.abs(height_proportion - side_proportion) + 1))
          else if (text == '.')
            return y_pos + (y.bandwidth() / 5 - square_margin) / (1.75 * (Math.abs(height_proportion - side_proportion) + 1))
          else
            return y_pos + (y.bandwidth() / 5 - square_margin) / (1.45 * (Math.abs(height_proportion - side_proportion) + 1))
        }

        var on_label_drag_end = function (event, d) {
          var el = d3.select("[id='" + parsed_cell_key(d) + "'].label");
          dragged_key = event['subject']['key'];
          var y_el = parseFloat(el.attr("y"));
          var new_y = y_el + event.dy;
          var next_data: {}[] = [];
          var moved_row_index = -1;
          var row_data = {};
          var row_y;
          var inserted = false;
          for (var i = 0; i < this.new_data.length; i++) {
            if (d3.select("[id='" + parsed_cell_key(this.new_data[i]) + "'].label").size() > 0) {
              if (parsed_cell_key(this.new_data[i]) != el.attr("id")) {
                row_y = parseFloat(d3.select("[id='" + parsed_cell_key(this.new_data[i]) + "'].label").attr("y"));
                next_data.push(this.new_data[i]);
                if (row_y - y.bandwidth() / 2 <= y_el && row_y + y.bandwidth() / 2 > y_el && !inserted) {
                  moved_row_index = i + 1;
                  next_data.push(row_data);
                }
              } else {
                row_data = this.new_data[i];
                row_y = y_pos_scroll(y(dragged_key));
                if (new_y <= row_y + y.bandwidth() && new_y > row_y) {
                  next_data.push(row_data);
                  inserted = true;
                } else if (moved_row_index >= 0) {
                  next_data[moved_row_index] = this.new_data[i];
                }
              }
            } else {
              next_data.push(this.new_data[i]);
            }
          }

          d3.select("#overview").remove();
          svg.remove();
          this.new_data = next_data;
          update.call(this);
        }

        rows.append("text")
          .attr("class", "nextgendem-msa label")
          .attr("id", (d) => parsed_cell_key(d))
          .attr("x", 10)
          .attr("y", function (d) {
            return y_pos_scroll(y_pos(d, y)) + y.bandwidth() / 1.7
          })
          .attr("text-anchor", "start")
          .style("font-size", "12px")
          .style("font-style", "italic")
          .style("cursor", "move")
          .attr('fill', function (d) {
            if (this.barcodingGroups.length > 0) {
              let i = 0;
              for (let g of this.barcodingGroups) {
                if (g.includes(cell_key(d))) {
                  return COLORS[i];
                }
                i++;
              }
            }
            return '#000000';
          }.bind(this))
          .text(function (d) {
            var key = cell_key(d);
            if (key.length > 25)
              return key.substring(0, 25) + '...';
            else
              return key;
          })
          .on("contextmenu", function (e) {
            e.preventDefault();
            var seq = {};
            for (var s of keys) {
              if (parsed_cell_key(s) == this.id) {
                seq = s;
              }
            }
            d3.selectAll("rect:not([id='" + parsed_cell_key(seq) + "']).column")
              .style("fill", function (d) {
                if (d3.select(this).classed("motif"))
                  return motif_color;
                return c(cell_text(d))
              });
            d3.selectAll("[id='" + parsed_cell_key(seq) + "'].column").style("fill", function (d) {

              if (d3.select(this).classed("motif"))
                return sel_motif_color;
              return selected_c(cell_text(d))
            });

            edit_keys = []
            var i = 0
            for (var i = 0; i < seq["value"].length; i++) {
              edit_keys.push({'key': seq['key'], 'pos': i, 'nucl': seq['value'][i]});
            }
          })
          .call(d3.drag<SVGTextElement, {}, SVGSVGElement>()
            .on("start", function (d) {
              var el = d3.select(this);
              d3.select(this.parentElement).raise();
              el.attr("opacity", "0.7")
              d3.selectAll(".label:not([id='" + el.attr("id") + "'])").attr("opacity", "0.3");
              d3.selectAll("rect.column:not([id='" + el.attr("id") + "'])").attr("opacity", "0.3");
              d3.selectAll(".nucl:not([id='" + el.attr("id") + "'])").attr("opacity", "0.3");
            })
            .on("drag", function (d) {
              var el = d3.select(this);
              var new_y = parseFloat(el.attr("y")) + d.dy;
              el.attr("y", new_y);
              var cols = d3.selectAll("[id='" + el.attr("id") + "'].column");
              cols.attr("y", new_y - y.bandwidth() / 1.75);
              var nucl = d3.selectAll("[id='" + el.attr("id") + "'].nucl");
              var new_nucl_y = drag_text_cell_y_pos(nucl.text(), new_y)
              nucl.attr("y", new_nucl_y);
              var el = d3.select(this);
              var y_el = parseFloat(el.attr("y"));
              var row_y;
              for (var i = 0; i < keys.length; i++) {
                if (d3.select("[id='" + parse_key(keys[i]) + "'].label").size() > 0) {
                  if (parse_key(keys[i]) != el.attr("id")) {
                    row_y = parseFloat(d3.select("[id='" + parse_key(keys[i]) + "'].label").attr("y"));
                    if (row_y - y.bandwidth() / 2 <= y_el && row_y + y.bandwidth() / 2 > y_el) {
                      d3.selectAll("[id='" + parse_key(keys[i]) + "'].column")
                        .style("filter", "brightness(25%)")
                        .attr("opacity", "0.8");

                      d3.select("[id='" + parse_key(keys[i]) + "'].label")
                        .style("fill", "#01b4bb")
                        .attr("opacity", "0.8");
                    } else {
                      d3.selectAll("[id='" + parse_key(keys[i]) + "'].column")
                        .style("filter", "brightness(100%)")
                        .attr("opacity", "0.3");

                      d3.select("[id='" + parse_key(keys[i]) + "'].label")
                        .style("fill", '#000000')
                        .attr("opacity", "0.3");
                    }
                  }
                }
              }
            })
            .on("end", on_label_drag_end.bind(this)));

        var first_column_pos = Number.POSITIVE_INFINITY;



        var column = rows
          .append("g")
          .attr("class", "nextgendem-msa")
          .attr("id", "scrollgroup")
          .attr("x", x(0))
          .attr("y", y_pos(this.new_data[0], y) - y.bandwidth() * 2)
          .attr("width", "inherit")
          .attr("height", "inherit")
          .selectAll(".column")
          .data(extract_row_data)
          .enter()
          .filter(function (d) {
              if (x_pos(d, x) >= x_start_pos && x_pos(d, x) < first_column_pos) {
                first_column_pos = x_pos(d, x);
              }
              return x_pos(d, x) >= x_start_pos && x_pos(d, x) <= x_start_pos + (svg_width - margin.left - margin.right * 2);
            });

        var x_pos_scroll = function (x_pos) {
          if (x_bar_pos >= margin.left) {
            var margin_correction = first_column_pos - x_start_pos;
            return x_pos - x_start_pos + margin.left - margin_correction;
          } else
            return x_pos - x_start_pos;
        }

        var transform_column = function (d) {
          var i = cell_index(d);
          if (i % 5 == 0 || i == 1 || this.barcodingColumns.length != 0) {
            return "translate(" + (x_pos_scroll(x_pos(d, x)) + (x(1) - x(0) + square_margin) / 3) + "px, " + (margin.top - 10) + "px) rotate(-45deg)";
          } else
            return "translate(" + ((x_pos_scroll(x_pos(d, x))) + (x(1) - x(0) + square_margin) / 4.5) + "px, " + (margin.top - 10) + "px)";
        }

        var column_text = function (d) {
          var i = cell_index(d);
          if (this.barcodingColumns.length != 0) {
            return this.barcodingColumns[+i - 1];
          }
          if (i % 5 == 0 || i == 1)
            return +i;
          else
            return "• ";
        }



        column.filter(function (d, i) {
          return parsed_cell_key(d) == first_row_key
        })
          .append("text")
          .attr("class", "nextgendem-msa label")
          .style("font-size", "15px")
          .style("transform", transform_column.bind(this))
          .text(column_text.bind(this));


        var on_column_click = function (event, data) {
          const id = parsed_cell_key(data);
          shift_last_clicked = false;
          if (edit_keys.includes(data)) {
            d3.select("[id='" + id + "'].column.p" + (cell_index(data) - 1)).style("fill", function (d) {
              if (d3.select(this).classed("motif"))
                return motif_color;
              return c(cell_text(d))
            });
            edit_keys = edit_keys.filter(el => el != data);
          } else if (event.shiftKey) {
            d3.select("[id='" + id + "'].column.p" + (cell_index(data) - 1)).style("fill", function (d) {
              if (d3.select(this).classed("motif"))
                return motif_color;
              return c(cell_text(d))
            });
            var new_selected = [data].concat(shift_clicked_nucls(this.new_data, edit_keys, data));
            for (s of edit_keys) {
              d3.select("[id='" + parsed_cell_key(s) + "'].column.p" + (cell_index(s) - 1)).style("fill", function (d) {
                if (d3.select(this).classed("motif"))
                  return motif_color;
                return c(cell_text(d))
              });
            }
            for (var s of new_selected) {
              d3.select("[id='" + parsed_cell_key(s) + "'].column.p" + (cell_index(s) - 1)).style("fill", function (d) {
                if (d3.select(this).classed("motif"))
                  return sel_motif_color;
                return selected_c(cell_text(d))
              });
            }

            edit_keys = new_selected;
          } else {
            d3.select("[id='" + id + "'].column.p" + (cell_index(data) - 1)).style("fill", function (d) {
              if (d3.select(this).classed("motif"))
                return sel_motif_color;
              return selected_c(cell_text(d))
            });
            if (event.ctrlKey || event.metaKey) {
              edit_keys.push(data);
            } else {
              d3.selectAll("rect:not([id='" + id + "'].column.p" + (cell_index(data) - 1) + ").column")
                .style("fill", function (d) {
                  if (d3.select(this).classed("motif"))
                    return motif_color;
                  return c(cell_text(d))
                });
              edit_keys = [data]
            }
          }
        }

        on_column_click = on_column_click.bind(this);
        var last_mouseover = {};
        var context_menu_box = function (e, d) {
          e.preventDefault();
          var contextElement = d3.selectAll("#context-menu");
          contextElement.attr("visibility", "visible");
          contextElement.attr("x", e.offsetX);
          contextElement.attr("y", function () {
            return +d3.select(this).attr("y") + e.offsetY;
          });

          var contextElement = d3.selectAll("rect#context-menu");
          contextElement.attr("visibility", "visible");
          contextElement.attr("x", e.offsetX);
          contextElement.attr("y", function (this, d, i) {
            return +d3.select(this).attr("height").substring(0, 2) * i + e.offsetY;
          });
        }

        let column_rects = column.append("rect")
          .attr("class", (d) => "nextgendem-msa column p" + (cell_index(d) - 1))
          .attr("id", function (d) {
            return parsed_cell_key(d)
          })
          .attr("x", function (d) {
            return x_pos_scroll(x_pos(d, x))
          })
          .attr("y", function (d) {
            return y_pos_scroll(y_pos(d, y))
          })
          .attr("width", function (d) {
            return x(1) - x(0) - square_margin;
          })
          .attr("height", function (d) {
            return y.bandwidth() - square_margin;
          })
          .style("fill", function (d) {
            let color = cell_color(d, c);
            let key = cell_key(d)
            if (Object.keys(this.seqs_groups).length > 0) {
              if (!(key in this.barcodingPositions) || !this.barcodingPositions[key].includes(this.barcodingColumns[parseInt(d.pos) - 1])) {
                color = '#777777'
              }
            }
            return color;
          }.bind(this))
          .style("stroke-width", "0")
          .style("cursor", "pointer")

          if (Object.keys(this.seqs_groups).length === 0) {
            column_rects.on("mousemove", function (event, data) {
              if (this.classList.contains("column")) {
                cursor_key = cell_key(data);
                cursor_pos = (+cell_index(data)).toString();
                d3.select("#cursor_key").text(`${cursor_key_label}:  ${cursor_key}`);
                d3.select("#cursor_pos").text(`${cursor_pos_label}:  ${cursor_pos}`);
                if (event.buttons == 1 && event.ctrlKey) {
                  if (last_mouseover != data) {
                    last_mouseover = data;
                    on_column_click(event, data);
                  }
                } else {
                  last_mouseover = {};
                }
              }
            })
              .on("click", function (ev, d) {
                on_column_click(ev, d)
              })
              .on("contextmenu", context_menu_box);
          }

        let column_texts = column.append("text")
          .text(cell_text)
          .style("fill", function (d) {
             if (Object.keys(this.seqs_groups).length > 0) {
              if (!(key in this.barcodingPositions) || !this.barcodingPositions[key].includes(this.barcodingColumns[parseInt(d.pos) - 1])) {
                return '#FFFFFF'
              }
            }
            else if ("ACGT".includes(cell_text(d)))
              return "#FFFFFF"
            return "black"
          }.bind(this))
          .attr("id", function (d) {
            return parsed_cell_key(d)
          })
          .attr("class", "nextgendem-msa nucl")
          .style("font-family", "sans-serif")
          //.style("font-weight", "bold")
          .attr("x", function (d) {
            if (cell_text(d) == '-')
              return (x_pos_scroll(x_pos(d, x))) + (x(1) - x(0) - square_margin) / (2.6 * (Math.abs(width_proportion - side_proportion) + 1))
            else if ((cell_text(d) == '.'))
              return (x_pos_scroll(x_pos(d, x))) + (x(1) - x(0) - square_margin) / (2.5 * (Math.abs(width_proportion - side_proportion) + 1))
            else
              return (x_pos_scroll(x_pos(d, x))) + (x(1) - x(0) - square_margin) / (3.3 * (Math.abs(width_proportion - side_proportion) + 1))
          })
          .attr("y", function (d) {
            return text_cell_y_pos(cell_text(d), y_pos(d, y))
          })
          .style("font-size", "14px")
          .style("cursor", "pointer")

          if (Object.keys(this.seqs_groups).length === 0) {
            column_texts.on("click", function (ev, d) {
              on_column_click(ev, d)
            })
            .on("contextmenu", context_menu_box);
          }



        var scrollBarSize = 8;

        if (width > svg_width - margin.left - margin.right) {

          var x_bar = svg
            .append('rect')
            .attr("x", x(0))
            .attr("y", alignment_height + margin.top + 10)
            .attr("width", alignment_width)
            .attr("height", scrollBarSize)
            .style("fill", "#cccccc");

          var x_miniBar = svg
            .append("rect")
            .attr("class", "miniBar")
            .attr("x", x_bar_pos)
            .attr("y", alignment_height + margin.top + 10)
            .attr("width", alignment_width / width * alignment_width)
            .attr("height", scrollBarSize)
            .style("fill", "#666666");

          var drag_x_end = function (d, n) {
            d3.select("#overview").remove();
            svg.remove();
            update.call(this);
            x_miniBar.style("fill", "#666666");
          }

          var dragXInteraction = d3.drag<SVGRectElement, unknown, HTMLElement>()
            .on("start", function (d, n) {
              x_miniBar
                .style("fill", "#999999");
            })
            .on("drag", function (d, n) {
              x_bar_pos = Math.max(x(0), Math.min(d.x, svg_width - margin.left - margin.right - parseFloat(x_miniBar.attr("width"))));
              x_miniBar.attr("x", x_bar_pos);
            }).on("end", drag_x_end.bind(this));

          x_miniBar.call(dragXInteraction);
        }

        var on_body_keydown = function (this, event, data) {
          if (event.isComposing || event.keyCode === 229 || this.isVisibleModal || this.preventKeydown) {
            return;
          }
          var next_data: {}[] = [];
          var new_data_str = "";
          if (event.code == "Space") {
            event.preventDefault();
            var key_pos_inserted = {}
            new_data_str = JSON.stringify(this.new_data);
            if (!shift_last_clicked) {
              for (var el of edit_keys) {
                var n = 0;
                if (key_pos_inserted[el['key']] !== undefined) {
                  n = key_pos_inserted[el['key']].filter((x: number) => x < el['pos'] - 1).length;
                  key_pos_inserted[el['key']].push(+el['pos'] - 1);
                } else {
                  key_pos_inserted[el['key']] = [+el['pos'] - 1];
                }
                next_data = put_gap(this.new_data, +el['pos'] - 1 + n, el['key']);
                post_states = [];
              }
            } else {
              for (var el of edit_keys) {
                if (key_pos_inserted[el['key']] !== undefined) {
                  n = key_pos_inserted[el['key']].filter((x: number) => x < el['pos'] - 1).length;
                  key_pos_inserted[el['key']].push(+el['pos'] - 1);
                } else {
                  key_pos_inserted[el['key']] = [+el['pos'] - 1];
                }

                post_states = [];
              }

              for (var k of Object.keys(key_pos_inserted)) {
                for (var i = 0; i < key_pos_inserted[k].length; i++) {
                  next_data = put_gap(this.new_data, Math.min(...key_pos_inserted[k]), k);
                }
              }
            }

          } else if (event.code == "Backspace") {
            var key_pos_deleted = {}
            if (edit_keys.length > 0) {
              new_data_str = JSON.stringify(this.new_data);
              for (var el of edit_keys) {
                var n = 0;
                if (key_pos_deleted[el['key']] !== undefined) {
                  n = key_pos_deleted[el['key']].filter((x: number) => x < el['pos'] - 1).length;
                  key_pos_deleted[el['key']].push(+el['pos'] - 1);
                } else {
                  key_pos_deleted[el['key']] = [+el['pos'] - 1];
                }
                next_data = delete_pos(this.new_data, +el['pos'] - 1 - n, el['key']);
                post_states = [];
              }
            }
          } else if (event.key != undefined && "AGCTRYSWKMBVHDN.-?".includes(event.key.toUpperCase())) {
            if (edit_keys.length > 0) {
              new_data_str = JSON.stringify(this.new_data);
              for (var el of edit_keys) {
                next_data = change_cell_content(this.new_data, +el['pos'] - 1, el['key'], event.key.toUpperCase());
                post_states = [];
              }
            }
          } else if (event.key != undefined && event.key.toUpperCase() == "Z") {
            if (event.ctrlKey || event.metaKey) {
              if (event.shiftKey && post_states.length > 0) {
                new_data_str = JSON.stringify(this.new_data);
                next_data = JSON.parse(post_states.pop()!);
              } else if (!event.shiftKey && prev_states.length > 0) {
                next_data = JSON.parse(prev_states.pop()!);
                insert_state(JSON.stringify(this.new_data), post_states);

              }
            }
          }

          if (next_data.length > 0) {
            if (new_data_str != "") insert_state(new_data_str, prev_states);
            search_params = ["", "false", "false"];
            d3.select("#overview").remove();
            fix_overview = true;
            no_move = true;
            edit_keys = [];
            svg.remove();
            this.new_data = next_data;
            update.call(this);
          }
        }

        d3.select("body")
          .on("keydown", on_body_keydown.bind(this))
          .on("click", function (e) {
            d3.selectAll("#context-menu")
              .attr("visibility", "hidden")
              .attr("x", 0)
              .attr("y", 0);
          });
        //starts overview
        if (Object.keys(this.barcodingPositions).length === 0) {
          var first_column: any = d3.select(".column").data()[0]!;
          var first_column_key_idx = Math.round((y(first_column['key'])! - margin.top) / y.bandwidth());
          var overview_height = Math.round(150 * height_proportion);
          var overview_width = Math.round(800 * width_proportion - (700 + 96) * (1 - width_proportion));//700 is the position of the overview and 24*4 the padding of the page

          d3.select("#browser")
            .select("div")
            .select("input")
            .style("left", 700 + overview_width - 70 + "px");//24 is the padding of the page

          d3.select("#browser").select("i.arrow.left")
            .style("top", height_proportion * 90 + "px");

          d3.select("#browser").select("i.arrow.right")
            .style("top", height_proportion * 90 + "px")
            .style("left", 700 + overview_width + 3 + "px");

          d3.select("#browser").select("i.arrow.up")
            .style("left", 700 + overview_width / 2 + 5.75 + "px");

          d3.select("#browser").select("i.arrow.down")
            .style("top", height_proportion * 175 + "px")
            .style("left", 700 + overview_width / 2 + 5.75 + "px");
        }

          if (height > svg_height - margin.top - margin.bottom) {
            var y_bar = svg
              .append('rect')
              .attr("x", svg_width - margin.left - margin.right + 10)
              .attr("y", margin.top)
              .attr("width", scrollBarSize)
              .attr("height", svg_height - margin.top * 2 - margin.bottom)
              .style("fill", "#cccccc");

            var y_miniBar = svg
              .append("rect")
              .attr("class", "miniBar")
              .attr("x", (svg_width - margin.left - margin.right + 10))
              .attr("y", y_bar_pos)
              .attr("width", scrollBarSize)
              .attr("height", alignment_height / height * alignment_height)
              .style("fill", "#666666");

            var drag_y_end = function (d, n) {
              d3.select("#overview").remove();
              svg.remove();
              update.call(this);
              y_miniBar.style("fill", "#666666");
            }

            var dragYInteraction = d3.drag<SVGRectElement, unknown, HTMLElement>().on("start", function (d, n) {
              y_miniBar
                .style("fill", "#999999");
            })
              .on("drag", function (d, n) {
                y_bar_pos = Math.max(margin.top, Math.min(d.y, svg_height - y(keys[0]) - margin.bottom - parseFloat(y_miniBar.attr("height"))));
                y_miniBar.attr("y", y_bar_pos);
              }).on("end", drag_y_end.bind(this));

            y_miniBar.call(dragYInteraction);
          }
          // Transitions
          if (dragged_key != "") {
            d3.selectAll("[id='" + parse_key(dragged_key) + "'].label")
              .transition().duration(0)
              .style("fill", "#01b4bb")
              .transition().duration(2500)
              .style("fill", function (d) {
                 if (this.barcodingGroups.length > 0) {
                  let i = 0;
                  for (let g of this.barcodingGroups) {
                    if (g.includes(cell_key(d))) {
                      return COLORS[i];
                    }
                    i++;
                  }
                }
                return '#000000';
              }.bind(this));

            d3.selectAll("[id='" + parse_key(dragged_key) + "'].column")
              .transition().duration(0)
              .style("filter", "brightness(70%)")
              .transition().duration(3500)
              .style("filter", "brightness(100%)");

            dragged_key = "";
        }

        //Context Menu

        var delete_columns_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          var columns: number[] = [];
          for (var el of edit_keys) {
            columns.push(el['pos'] - 1);
          }
          columns.sort(function (a, b) {
            return b - a;
          });
          columns = [...new Set(columns)];
          for (var c of columns) {
            this.new_data = delete_column(this.new_data, c);
          }

          d3.select("#overview").remove();
          edit_keys = [];
          svg.remove();
          no_move = true;
          update.call(this);
        }

        var delete_rows_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          var next_data: {}[] = []
          var rows: string[] = [];
          for (var el of edit_keys) {
            rows.push(el['key']);
          }
          rows = [...new Set(rows)];
          for (var r of rows) {
            next_data = delete_taxon(this.new_data, r);
          }

          let next_aln_length = 0;
          for (const s of next_data) {
            if (s['value'].length > next_aln_length) {
              next_aln_length = s['value'].length;
            }
          }

          next_data = delete_gappy_columns(next_data, next_aln_length);

          d3.select("#overview").remove();
          edit_keys = [];
          svg.remove();
          no_move = true;
          this.new_data = next_data;
          update.call(this);
        }

        var delete_gappy_columns_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          this.new_data = delete_gappy_columns(this.new_data, aln_length);
          d3.select("#overview").remove();
          edit_keys = [];
          svg.remove();
          no_move = true;
          update.call(this);
        }

        var complement_positions = function () {
          var key_idx = -1;
          for (var ek of edit_keys) {
            key_idx = Math.round((y(ek['key'])! - margin.top) / y.bandwidth());
            if (Object.keys(complement_map).includes(this.new_data[key_idx]['value'][ek['pos']]))
              this.new_data[key_idx]['value'][ek['pos'] - 1] = complement_map[ek['nucl']];
          }
        }

        var complement_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          complement_positions.call(this);
          d3.select("#overview").remove();
          edit_keys = []
          svg.remove();
          no_move = true;
          update.call(this);
        }

        var reverse_subarray = function (arr: [], start: number, end: number) {
          var d = (end - start + 1) / 2;
          for (var i = 0; i < d; i++) {
            var t = arr[start + i];
            arr[start + i] = arr[end - i];
            arr[end - i] = t;
          }
          return arr
        }

        var reverse = function () {
          var key_idx = -1;
          var key_positions: {} = {}
          for (var ek of edit_keys) {
            if (!Object.keys(key_positions).includes(ek["key"])) {
              key_positions[ek['key']] = [];
            }
            key_positions[ek['key']].push(+ek['pos'] - 1);
          }
          var key_start_end = {}
          var sorted_positions: [];
          var positions: number[];
          for (var key of Object.keys(key_positions)) {
            key_start_end[key] = [];
            key_positions[key].sort(function (a, b) {
              return a - b;
            });
            positions = [];
            for (var p of key_positions[key]) {
              if (positions.length == 0 || positions[positions.length - 1] + 1 == p) {
                positions.push(JSON.parse(JSON.stringify(p)));
              } else {
                if (positions.length > 1) {
                  var hard_copy_of_positions = JSON.parse(JSON.stringify(positions))
                  key_start_end[key].push([Math.min(...hard_copy_of_positions), Math.max(...hard_copy_of_positions)])
                }
                positions = [];
              }
            }
            if (positions.length > 1) {
              key_start_end[key].push([Math.min(...positions), Math.max(...positions)])
            }
          }

          var key_idx = -1;
          var delete_gaps_key_idx: number[] = []; // only used in reverse complement
          for (var key of Object.keys(key_start_end)) {
            key_idx = Math.round((y(key)! - margin.top) / y.bandwidth());
            for (var start_end of key_start_end[key]) {
              if (start_end[0] == 0 && start_end[1] - start_end[0] + 1 == this.new_data[key_idx]["value"].length) {
                delete_gaps_key_idx.push(key_idx);
              }
              this.new_data[key_idx]["value"] = reverse_subarray(this.new_data[key_idx]["value"], start_end[0], start_end[1])
            }
          }
          return delete_gaps_key_idx;
        }

        var reverse_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          reverse.call(this);
          d3.select("#overview").remove();
          edit_keys = []
          svg.remove();
          update.call(this);
        }

        var reverse_complement_click = function () {
          insert_state(JSON.stringify(this.new_data), prev_states);
          complement_positions.call(this);
          var delete_gaps_key_idx = reverse.call(this);
          var seq_without_gaps: string[] = []
          for (var key_idx of delete_gaps_key_idx) {
            for (var i = 0; i < this.new_data[key_idx]['value'].length; i++) {
              if (this.new_data[key_idx]['value'][i] != "-") {
                seq_without_gaps.push(this.new_data[key_idx]['value'][i]);
              }
            }
            this.new_data[key_idx]['value'] = seq_without_gaps;
          }
          edit_keys = []
          d3.select("#overview").remove();
          svg.remove();
          no_move = true;
          update.call(this);
        }


        var contextElement = svg
          .append("g")
          .attr("class", "nextgendem-msa")
          .attr("x", 0)
          .attr("y", svg_height - margin.bottom)
          .attr('pointer-events', 'visible')
          .attr("id", "context-menu")
          .style("height", "140px")
          .style("width", "200px")
          .attr("visibility", "hidden");

        var context_options = [
          {"text": "Delete Columns", "listener": delete_columns_click.bind(this), "class": "delete_columns"},
          {"text": "Delete Rows", "listener": delete_rows_click.bind(this), "class": "delete_columns"},
          {
            "text": "Delete Gappy Columns",
            "listener": delete_gappy_columns_click.bind(this),
            "class": "delete_columns"
          },
          {"text": "Reverse", "listener": reverse_click.bind(this), "class": "reverse"},
          {"text": "Complement", "listener": complement_click.bind(this), "class": "complement"},
          {
            "text": "Reverse Complement",
            "listener": reverse_complement_click.bind(this),
            "class": "reverse_complement"
          }]

        for (var i = 0; i < context_options.length; i++) {
          var rect = contextElement.append("rect")
            .attr("id", "context-menu")
            .style("fill", "#1b1a1a")
            .attr("class", context_options[i]["text"])
            .attr("y", i * 35)
            .attr("width", "200px")
            .attr("height", "35px")
            .attr('stroke', 'white')
            .attr('stroke-width', '0.5')
            .on('mouseover', function (e) {
              d3.select(this)
                .style("filter", "brightness(250%)");
            })
            .on('mouseout', function (e) {
              var el = d3.select(this);
              if (+el.attr("y") >= e.offsetY || +el.attr("y") + +el.attr("height").slice(0, -2) <= e.offsetY ||
                +el.attr("x") >= e.offsetX || +el.attr("x") + +el.attr("width").slice(0, -2) <= e.offsetX)
                el.style("filter", "brightness(100%)");
            })
            .on("click", context_options[i]["listener"]);

          contextElement.append("text")
            .attr("class", "nextgendem-msa")
            .attr("id", "context-menu")
            .attr("dy", +rect.attr("y") + 21)
            .attr("dx", 15)
            .style("fill", "#eee")
            .text(context_options[i]["text"])
            .on("click", context_options[i]["listener"]);
        }

        //Overview
        if (Object.keys(this.barcodingPositions).length === 0) {
          if (d3.select("#overview").size() == 0) {

            var taxons_in_viewer = Math.ceil(alignment_height / y.bandwidth());
            var aln_length_in_viewer = Math.ceil((alignment_width - x(0)) / (x(1) - x(0) + square_margin));
            var key: string;
            var seq: string[];
            var n_overview_taxons = Math.min(overview_height, keys.length);
            var n_overview_aln_length = Math.min(overview_width, aln_length);

            if (!fix_overview) {
              overview_x_start = Math.max(0, Math.min(Math.floor(+first_column['pos']! + aln_length_in_viewer / 2 - n_overview_aln_length / 2), aln_length - n_overview_aln_length));
              overview_y_start = Math.max(0, Math.min(Math.floor(first_column_key_idx + taxons_in_viewer / 2 - n_overview_taxons / 2), keys.length - n_overview_taxons));
            }


            d3.selectAll("#position_rect").remove();

            var overview = d3.select("#browser")
              .append("div")
              .style("position", "absolute")
              .style("top", "20px")
              .style("left", "700px")
              .style("height", overview_height + "px")
              .style("width", overview_width + "px")
              .attr("id", "overview")
              .append("canvas")
              .attr("id", "overview_canvas")
              .attr("height", overview_height)
              .attr("width", overview_width)
              .style("border", "1px")
              .style("border-collapse", "collapse")
              .style("padding", "0px")
              .style("height", overview_height + "px")
              .style("width", overview_width + "px");


            const canvas = overview.node();
            const getCanvasBlob = (blob: Blob) => {
              this.canvasBlob = blob;
            }

            const overview_context = canvas.getContext('webgl2');

            const program = overview_context.createProgram();

            const vertexShader = overview_context.createShader(overview_context.VERTEX_SHADER);
            const vertexShaderSource = `#version 300 es
                                      // an attribute is an input (in) to a vertex shader.
                                      // It will receive data from a buffer
                                      layout(location = 0) in vec2 a_position;
                                      layout(location = 1) in vec3 aColor;

                                      out vec3 vColor;
                                      // all shaders have a main function
                                      void main() {
                                        vec2 resolution = vec2(${overview_width}, ${overview_height});
                                        //convert the position from pixels to 0.0 to 1.0
                                        vec2 zeroToOne = a_position / resolution;
                                        //convert from 0->1 to 0->2
                                        vec2 zeroToTwo = zeroToOne * 2.0;
                                        //convert from 0->2 to -1->+1 (clipspace)
                                        vec2 clipSpace = zeroToTwo - 1.0;
                                        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                                        vColor = aColor;
                                      }
          `;
            overview_context.shaderSource(vertexShader, vertexShaderSource);
            overview_context.compileShader(vertexShader);
            overview_context.attachShader(program, vertexShader);

            const fragmentShader = overview_context.createShader(overview_context.FRAGMENT_SHADER);
            const fragmentShaderSource = `#version 300 es

                                        precision highp float;

                                        in vec3 vColor;

                                        out vec4 fragColor;

                                        void main()
                                        {
                                            fragColor = vec4(vColor, 1.0);
                                        }
          `;
            overview_context.shaderSource(fragmentShader, fragmentShaderSource);
            overview_context.compileShader(fragmentShader);
            overview_context.attachShader(program, fragmentShader);

            overview_context.linkProgram(program);

            if (!overview_context.getProgramParameter(program, overview_context.LINK_STATUS)) {
              console.log('WebGL error:');
              console.log(overview_context.getShaderInfoLog(vertexShader));
              console.log(overview_context.getShaderInfoLog(fragmentShader));
            }

            overview_context.useProgram(program);

            const aPositionLoc = 0;
            const aColorLoc = 1;

            var overview_cell_width = overview_width / n_overview_aln_length;
            var overview_cell_height = overview_height / n_overview_taxons;


            var get_webgl_rectangle = function (x, y, height, width, color) {
              var x1 = x;
              var x2 = x + width;
              var y1 = y;
              var y2 = y + height;
              return [
                x1, y1, ...color,
                x2, y1, ...color,
                x1, y2, ...color,
                x2, y2, ...color,
              ];
            }

            let rectangle;
            let rectangle_color;
            let hexColor: string;
            let rgb: RegExpExecArray;
            let vertices_arrays = [];
            for (let z = 0; z < n_overview_taxons; z++) {
              key = this.new_data[z + overview_y_start]['key'];
              seq = this.new_data[z + overview_y_start]['value'];
              for (let w = 0; w < n_overview_aln_length; w++) {
                if (key === first_column['key'] && w + overview_x_start === +first_column['pos'] && !fix_overview) {
                  overview_bar_x = w * overview_cell_width;
                  overview_bar_y = z * overview_cell_height;
                }
                rectangle = [w * overview_cell_width, z * overview_cell_height, overview_cell_height, overview_cell_width];
                hexColor = c(seq[w + overview_x_start]);
                rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
                rectangle_color = [parseInt(rgb[1], 16) / 255, parseInt(rgb[2], 16) / 255, parseInt(rgb[3], 16) / 255];
                /**** No reemplazar el push por el concat, el concat va muchisimo mas lento ****/
                vertices_arrays.push(get_webgl_rectangle(rectangle[0], rectangle[1], rectangle[2], rectangle[3], rectangle_color))
                /**** se termina el push conflictivo ****/
              }
            }

            overview_context.viewport(0, 0, overview_width, overview_height);
            overview_context.clearColor(0, 0, 0, 0);
            overview_context.clear(overview_context.COLOR_BUFFER_BIT | overview_context.DEPTH_BUFFER_BIT);
            /**** I need to make the concatanation divided in three times because if not I get a call function stack overflow ****/
            let vertices = Array.prototype.concat.apply([], vertices_arrays.slice(0, vertices_arrays.length / 3))
            vertices = vertices.concat(Array.prototype.concat.apply([], vertices_arrays.slice(vertices_arrays.length / 3 + 1, 2 * vertices_arrays.length / 3 + 1)));
            vertices = vertices.concat(Array.prototype.concat.apply([], vertices_arrays.slice(2 * vertices_arrays.length / 3 + 1)));
            vertices_arrays.length = 0;
            /**** Finish concatenation ****/
            const verticesBuffer = overview_context.createBuffer();
            overview_context.bindBuffer(overview_context.ARRAY_BUFFER, verticesBuffer);
            overview_context.bufferData(overview_context.ARRAY_BUFFER, new Float32Array(vertices), overview_context.STATIC_DRAW);
            const ver_len = vertices.length;
            vertices = null;
            overview_context.vertexAttribPointer(aPositionLoc, 2, overview_context.FLOAT, false, 2 * 4 + 3 * 4, 0);
            overview_context.vertexAttribPointer(aColorLoc, 3, overview_context.FLOAT, false, 2 * 4 + 3 * 4, 2 * 4);
            overview_context.enableVertexAttribArray(aPositionLoc);
            overview_context.enableVertexAttribArray(aColorLoc);
            overview_context.drawArrays(overview_context.TRIANGLE_STRIP, 0, ver_len / 5);

            canvas.toBlob(getCanvasBlob.bind(this), 'image/png');

            var overview_bar_height = Math.min((alignment_height - y.bandwidth())/ (n_overview_taxons * (y.bandwidth())) * overview_height, overview_height)
            var overview_bar_width = Math.min((alignment_width - (x(1) - x(0)) - margin.right)  / (n_overview_aln_length * (x(1) - x(0))) * overview_width, overview_width)

            var overview_bar = d3.select("#browser")
              .append("div")
              .attr("id", "position_rect")
              .style("position", "absolute")
              .style("top", "20px")
              .style("left", "700px")
              .append("svg")
              .attr("height", overview_height)
              .attr("width", overview_width)
              .style("pointer-events", "painted")
              .style("fill", "none")
              .append("rect")
              .attr("x", overview_bar_x)
              .attr("y", overview_bar_y)
              .attr("width", overview_bar_width)
              .attr("height", overview_bar_height)
              .style("fill", "white")
              .style("fill-opacity", 0.6)
              .attr("stroke-width", "1")
              .attr("stroke", "black");

            var on_overview_drag = function (d, n) {
              var x_table_nucl_pos = Math.max(0, Math.floor(overview_bar_x / overview_cell_width));
              var y_table_nucl_pos = Math.floor(overview_bar_y / overview_cell_height);
              var key = keys[y_table_nucl_pos + overview_y_start];
              var pos = x_table_nucl_pos + overview_x_start;
              y_start_pos = y(key)!;
              x_start_pos = x(pos);
              force_update_bar = true;
              d3.select("#total_viewer").remove();
              update.call(this);
              overview_bar.style("filter", "brightness(100%)");
            }

            var overviewDrag = d3.drag<SVGRectElement, unknown, HTMLElement>()
              .on("start", function (d, n) {
                d3.select(this).style("filter", "brightness(80%)");
              })
              .on("drag", function (d, n) {
                overview_bar_x = Math.max(0, Math.min(d.x, overview_width - Math.min(overview_bar_width, overview_width)));
                overview_bar_y = Math.max(0, Math.min(d.y, overview_height - Math.min(overview_bar_height, overview_height)));
                d3.select(this).attr("x", overview_bar_x);
                d3.select(this).attr("y", overview_bar_y);
              }).on("end", on_overview_drag.bind(this));

            overview_bar.call(overviewDrag);
          }
          fix_overview = false;
        }

        //Found searches
        var pos;
        for (var z = 0; z < found_searches.length; z++) {
          pos = found_searches[z]['pos']
          for (var w = 0; w < search_params[0].length; w++) {
            d3.select("[id='" + parse_key(keys[found_searches[z]['idx']]) + "'].column.p" + (pos + w))
              .attr("class", function () {
                return d3.select(this).attr("class") + " motif"
              })
              .style("fill", motif_color);
            d3.select("[id='" + parse_key(keys[found_searches[z]['idx']]) + "$" + (pos + w) + "']")
              .style("background-color", motif_color);
          }
        }

        //Arrows click
        var on_arrow_click = function (arrow_direction, e) {
          e.preventDefault();
          var pos_num = +d3.select("#scroll_num").property("value");
          if (arrow_direction === "left") {
            x_start_pos = x(Math.max(0, +first_column['pos'] - pos_num));
          } else if (arrow_direction === "right") {
            x_start_pos = x(Math.max(0, Math.min(aln_length - overview_width / 2, +first_column['pos'] + pos_num)));
          } else if (arrow_direction === "down") {
            y_start_pos = y(keys[Math.max(0, Math.min(first_column_key_idx + pos_num, keys.length - overview_height / 2))])!;
          } else if (arrow_direction === "up") {
            y_start_pos = y(keys[Math.max(first_column_key_idx - pos_num, 0)])!;
          }
          force_update_bar = true;
          d3.select("#overview").remove();
          svg.remove()
          update.call(this);
        }
        d3.selectAll("i.arrow.left").on("click", on_arrow_click.bind(this, 'left'));
        d3.selectAll("i.arrow.right").on("click", on_arrow_click.bind(this, 'right'));
        d3.selectAll("i.arrow.up").on("click", on_arrow_click.bind(this, 'up'));
        d3.selectAll("i.arrow.down").on("click", on_arrow_click.bind(this, 'down'));

        var prevent_keydown = function () {
          this.preventKeydown = true;
        }
        var activate_keydown = function () {
          this.preventKeydown = false;
        }
        prevent_keydown = prevent_keydown.bind(this);
        activate_keydown = activate_keydown.bind(this);

        d3.selectAll("select").on('focus', prevent_keydown).on('blur', activate_keydown);
        d3.selectAll("input").on('focus', prevent_keydown).on('blur', activate_keydown);

        d3.select('.loader').style('visibility', 'hidden');
        this.initLoading = false;

        var resize_update = update.bind(this);
        window.addEventListener("resize", (e) => {
          d3.select("#overview").remove();
          svg.remove();
          resize_update();
        }, {once: true});
        this.updating = false;
      }
    }

    var check_repeated_keys = function(parsed_fasta: {}[]) {
      var keys: string[] = [];
      var repeated_keys: Set<string> = new Set([]);
      for (var l of parsed_fasta) {
        if (!keys.includes(l['key']))
          keys.push(l['key']);
        else
          repeated_keys.add(l['key']);
      }
      return repeated_keys;
    }

    const textOption = { responseType: 'text' };
    const options = { ...this.globalVariablesServices.authOptions, ...textOption };
    console.log(this.Url)
    this.http.get(this.Url, options).subscribe({
       next: async fasta => {
         Object.values(this.barcodingPositions).forEach((v: number[]) => {
          this.barcodingColumns = this.barcodingColumns.concat(v);
         });
        this.barcodingColumns = [...new Set(this.barcodingColumns)].sort((a, b) => a - b);
        var fastaString = this.ab2str(fasta);
        var parsed_fasta = parse_fasta(fastaString);
        var repeated_keys = check_repeated_keys(parsed_fasta);
        this.new_data = parsed_fasta;
        if (repeated_keys.size == 0)
          update.call(this)
        else {
          var message = await this.internationalizationService.translate(
            "MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.LOG.DUPLICATED_SEQUENCES",
            {sequences: Array.from((repeated_keys)).join(',')});
          d3.select("#browser")
          .append("text")
           .attr("class", "nextgendem-msa")
          .style("position", "fixed")
          .style("top", "30%")
          .style("left", "10%")
          .style("font-size", "36px")
          .text(message)
          .style("color", "red")
        }
      },error:  error => {
        this.loading = false;
        this.msg.error(error.message);
      }, complete: () => {}
    });
  }
}

