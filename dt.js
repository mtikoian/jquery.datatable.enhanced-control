;


// ===== DATATABLE EXTEND ===== //

$.fn.dataTableExt.aoFeatures.push( {
    
    "cFeature" : "s",
    
    "fnInit" : function( oSettings ){
        
        var $node = $("<div/>",{ class : "dataTables_selection" , text : "no selection"});
        
        return $node;
        
    }

});


// =============================//


/**
    config example : 

    {
        
        data:[
            {id : "1" , name : "name1"},
            {id : "2" , name : "name2"}
        ],

        itemsRoot:"items",

        tableClass : "additional-custom-class",

        columns: [
    
            {   
                name        :"id",
                width       :20,
                render      :function(value,set,items,data){return value;},
                header      :"#",
                class       :"custom-class",
                searchable  : true,
                orderable   : true,
                visible     : true,
                type        : "string",
                
            },
            

        ],

        idField: "id",

        selectable: "single", // possible values "single","multiple",false

        selectionChange:function(){ console.log(this.getSelection()); };

        childContent : function(set,items,data){ return "Full Name : " + set.firstname + " " +  set.lastname; };

        // keep selection accross pagination / ordering / searching
        // it requires idField to be fill
        keepSelection : true


    }

 */



var dtEnhanced = function($){

    var dtEnhanced = {};



/*============== TABLE ==============*/

    
    
    dtEnhanced.table = function(config){

        jQuery.extend(
            this,
            dtEnhanced.table.defaultConfig,
            config
        );

        this.columns = this.initFields(this.columns);
        this.$table = this.initTable();

        this.internalSelection = {};

        this.lastSelection = null;

    };
    
    dtEnhanced.table.defaultConfig = {
        "columns"        : null,
        "idField"        : null,
        "selectable"     : "single",
        "selectionChange": null,
        "childContent"   : null,
        "tableClass"     : null,
        "keepSelection"  : true
    };

        

    dtEnhanced.table.prototype = {

        initFields: function(fields){

            var finalFields = [];

            for(var i in fields){
                if(fields[i] instanceof dtEnhanced.field ){
                    finalFields[i] = fields[i];
                }else{
                    if(typeof fields[i] === "object" &&  (!fields[i].type || !fields[i].type === "field" ) ){
                        finalFields[i] = new dtEnhanced.field(fields[i]);
                    }else{
                        
                        
                        var type = null
                        if(typeof fields[i] === "object")
                            type = fields[i].type;
                        else
                            type = fields[i];
                        
                        switch(type){

                            case "x":
                                finalFields[i] = new dtEnhanced.checkboxField(fields[i]);
                                break;
                                
                            case "+":
                                finalFields[i] = new dtEnhanced.detailsControlField(fields[i]);
                                break;

                            default:
                                finalFields[i] = new dtEnhanced.field(fields[i]);
                                break;

                        }
                    }
                }
            }

            return finalFields;

        },
                
        
        addItem : function(set){

            set = set || {};

            if(set instanceof Array){
                for(var i in set){
                    if(this._e_addItem(set[i])){
                        this.dt.row.add(set[i]);
                    }
                }
            }else{
                if(this._e_addItem(set)){
                    this.dt.row.add(set);
                }
            }
            
            this.dt.draw();

        },
                
        _e_addItem : function(item){
            return true;
        },
                

        initTable : function(){

            this.dtColumns = [];

            var self = this;
            var selfTable = this;
            var fields = this.columns;

            // PREPARE THE STRUCTURE
            var $table = $('<table class="table table-striped table-bordered"/>');
            var $thead = $("<thead/>");
            var $tbody  = $("<tbody/>");
            $table.append($thead);
            $table.append($tbody);
            
            if(this.tableClass){
                $table.addClass(this.tableClass);
            }

            $table.data("dtec-object",this);

            // CREATE THE HEADER
            $row = $("<tr/>");
            $thead.append($row);

            for(var i in fields){

                var field = fields[i];

                $col = field.makeHeaderCol(this);
                $row.append($col);

                var renderCallback = (function ( i , fields ){
                    return function ( data , type , set , meta ) {
                        return fields[i].makeBodyCol(self,set).html();
                    };
                }(i,fields));

                var createdCallback = (function ( i , fields ){
                    return function ( cell, cellData, rowData, rowIndex, colIndex ) {
                        fields[i].bindCol( self , cell );
                    };
                }(i,fields));

                var definition = {
                    "searchable"    : this.columns[i].searchable,
                    "orderable"     : this.columns[i].orderable,
                    "visible"       : this.columns[i].visible,
                    "width"         : this.columns[i].width,
                    "orderDataType" : field.orderDataType,
                    "data"          : this.columns[i].name,
                    "name"          : this.columns[i].name,
                    "render"        : renderCallback,
                    "createdCell"   : createdCallback
                };
                

                
                this.columns[i]._postInitDtColumnDef(this,definition);
                
                this.dtColumns.push(definition);

            }
 
            
            return $table;
        },


        __bindRow : function(set,tr){
            var $tr = $(tr);
            var self  = this;
            // CLICK HANDLER
            $tr.mousedown(function(e){
                self.rowClicked(this,e.shiftKey);

                if(e.shiftKey){
                    e.preventDefault();
                }
            });
            // STORE THE SET TO FIND IT LATER
            
            
            $tr.data("dtec-set",set);
        },

        // reserved for internal use
        // it applies the new stats of a row (selected/unselected) that is clicked
        // returns true if the stat changed
        __makeRowSelection : function(row,largeSelection){

            var self = this;

            if(this.selectable === false){
                return false;
            }

            var changed = false;

            if(largeSelection){
                if(this.lastSelection && this.$table.find(this.lastSelection)){
                    var mode = $(row).hasClass("dtec-row-selected") ? -1 : 1;

                    var s1 = this.lastSelection.index();
                    var s2 = $(row).index();

                    var start = s1 > s2 ? s2 : s1;
                    var end   = s1 > s2 ? s1 : s2;

                    $(this.$table).find("tr").slice( start + 1 , end + 2 ).each(function(){
                        if(self.__selectRow(this,mode)){
                            changed = true;
                        }
                    });

                }else{
                    changed = this.__selectRow(row,0);
                }

            }else{
                changed = this.__selectRow(row,0);
            }
            
            this.lastSelection = $(row);
            return changed;
        },

        /**
         * triggered when datatable is drawn
         * bound in table.show
         * @returns {undefined}
         */
        __onDraw : function(){
            
            // we must reset large selection
            this.lastSelection = null;
            
            if(this.keepSelection)
                this.__restoreSelection();

            this.__updateSelectionCount();
        },
                
                
        getRowId : function($row){
        
            return this.getSetId($row.data("dtec-set"));
        },
                
        getSetId : function(set){    
            if(this.idField){
                return set[this.idField];
            }
            return null;
        },
                
        __restoreSelection : function(){
    
            var self = this;
    
            this.$table.find("tbody tr").each(function(i,item){
                
                var $tr = $(item);
                var id  = self.getRowId($tr);
                if( id && self.internalSelection[id]){
                    $tr.addClass("dtec-row-selected");
                }else{
                    $tr.removeClass("dtec-row-selected");
                }
            });
    
        },
          
          
        __keepSelectionFeatureIsAvailable : function(){
            return this.keepSelection && this.idField;
        },
          
        /**
         * should not be called directly
         * used to keep selection across draw events
         */
        __internalSelectionAdd : function(set){
            this.internalSelection[this.getSetId(set)] = set;
        },
            
        /**
         * should not be called directly
         * used to keep selection across draw events
         */
        __internalSelectionRemove : function(id){
            this.internalSelection[id] = false;
            delete this.internalSelection[id];
        },

        __rowSetSelection : function($row,selected){
            if(selected){
                $row.addClass("dtec-row-selected");
                if(this.keepSelection)
                    this.__internalSelectionAdd($row.data("dtec-set"));
            }else{
                $row.removeClass("dtec-row-selected");
                if(this.keepSelection)
                    this.__internalSelectionRemove(this.getRowId($row));
            }
        },

        /**
         * internal use only
         * @param selectionType  -1:unselect only   1:selection only    0:automatique
         */
        __selectRow : function(row,selectionType){
            if(typeof this.selectable === "number"){
                if($(row).hasClass("dtec-row-selected" && selectionType !== 1)){
                    this.__rowSetSelection($(row),false);
                    return true;
                }else if( selectionType !== -1 ){
                    if(this.$table.find(".dtec-row-selected").length >= this.selectable){
                        // already reached the max selection
                        return false;
                    }else{
                        this.__rowSetSelection($(row),true);
                        return true;
                    }
                }
            }else if(this.selectable === "single"){
                if($(row).hasClass("dtec-row-selected" && selectionType !== 1)){
                    this.__rowSetSelection($(row),false);
                    return true;
                }else if( selectionType !== -1 ){
                    this.$table.find(".dtec-row-selected").removeClass("dtec-row-selected");
                    this.__rowSetSelection($(row),true);
                    return true;
                }
            }else if(this.selectable === "multi" || this.selectable){
                if( selectionType === 0 ){
                    if($(row).hasClass("dtec-row-selected")){
                        this.__rowSetSelection($(row),false);
                    }else{
                        this.__rowSetSelection($(row),true);
                    }
                }else if( selectionType === 1 ){
                    this.__rowSetSelection($(row),true);
                }else{
                    this.__rowSetSelection($(row),false);
                }
                return true;
            }
        },


        rowClicked : function(row,largeSelection){
            var s = this.__makeRowSelection(row,largeSelection);
            if(s){
                this.__updateSelectionCount();
                if(this.selectionChange)
                    this.selectionChange.apply(this,[]);
            }
        },
                
        /**
         * refresh the selection number visible by the user (sdom 's' feature)
         */
        __updateSelectionCount : function(){
            var $featureS = $(this.dt.settings()[0].aanFeatures.s[0]);

            var countTotal  = this.countSelection();
            var countVisible= this.getSelectedRows().length;
            
        
            
            var words = "";
            
            if(countTotal === 0){
                words = "no element selected";
            }else{
                words = countTotal + " elements selected";
                if(countTotal > countVisible){
                    words += " ( " + countVisible + "<span class='dtec-count-now-shown'>+" + (countTotal-countVisible) + "</span> )";
                }
                
            }

            $featureS.html(words);
        },

        countSelection : function(){
    
            if(this.keepSelection){
                var length = 0;
                for (var i in this.internalSelection) {
                    length++;
                }
                return length;
            }else
                return this.getSelectedRows().length;
        },

        /**
         * get selected rows dom element, but only visibles one
         * @returns {Array}
         */
        getSelectedRows : function(){
            var $rows = this.$table.find(".dtec-row-selected");
            
            return $rows;
        },

        /**
         * get the selection across the whole table (if keepSelection otpion is enabled)
         * returns only the datasets, not the dom element
         */
        getSelection :function(){
            
            var items = [];

            var rows = this.getSelectedRows();

            for(var i in rows){
                items.push($(rows[i]).data("dtec-set"));
            }

            return items;
        },
                
        clear : function(){
            if(this._e_clear()){
                this.dt.clear();
            }
        },
                
        _e_clear : function(){
            return true;
        },

        show : function(elm,dtConfig){

            var self = this;

            $(elm).html(this.$table);
            
            dtConfig = dtConfig || {};

            dtConfig.columns    = this.dtColumns;
            dtConfig.createdRow = function(row,data,index){
                self.__bindRow(data,row);
            };

            this.dt = this.$table.DataTable(dtConfig);
            
            // bind the draw event
            this.$table.on("draw.dt",function(e,settings){
                self.__onDraw(e,settings);
            });
            
        }
    };



/*============== DATATABLE ==============*/

    dtEnhanced.Datatable = function(config){
        var newConf = {};
        
        jQuery.extend(
            newConf,
            dtEnhanced.Datatable.defaultConfig,
            config
        );
            
        dtEnhanced.table.apply(this,[newConf]);
        
        // init the data item root if the set is initially empty 
        if(this.itemsRoot && !this.data[this.itemsRoot])
            this.data[this.itemsRoot] = [];

    };
    
    dtEnhanced.Datatable.prototype = Object.create(dtEnhanced.table.prototype);
    
    dtEnhanced.Datatable.defaultConfig = {
        "data"           : [],
        "itemsRoot"      : null
    };

    dtEnhanced.Datatable.prototype._e_addItem = function(item){
        
        if(this.itemsRoot)
            this.data[this.itemsRoot].push(item);
        else
            this.data.push(item);

        return true;
        
    };
    
    dtEnhanced.Datatable.prototype._e_clear = function(){
        if(this.itemsRoot){
            this.data[this.itemsRoot] = [];
        }else{
            this.data = [];
        }
        return true;
    };
    

    dtEnhanced.Datatable.prototype.getItems = function(){
        return this.itemsRoot ? this.data[this.itemsRoot] : this.data;
    };
            
    dtEnhanced.Datatable.prototype.show = function(elm,config){
        dtEnhanced.table.prototype.show.apply(this,[elm,config]);
        var items = this.getItems();
        for(var i in items){
            this.dt.row.add(items[i]);
        }
        this.dt.draw();
    };
    
    
    
    
/*============== AJAXTABLE ==============*/

    /**
     * config example :
     * {
     *  ajax : { // jquery ajax config : http://api.jquery.com/jQuery.ajax/
     *      url : "myjson.json"
     *  },
     *  
     *  autoload : true,  // will load the ajax automatically on show
     *  
     *  itemsRoot : "items",  // handy shortcut when itemList is not at the root of the array
     *  
     *  dataHandler : function(data){  var processedData = doSomething(data); return processedData; }
     *  // allows to parse data on your one way. If null or not defined the default behaviour is to use JSON.parse(data)
     *  
     */
    dtEnhanced.Ajaxtable = function(config){
        var newConf = {};
        
        jQuery.extend(
            newConf,
            dtEnhanced.Ajaxtable.defaultConfig,
            config
        );
            
        dtEnhanced.table.apply(this,[newConf]);

    };
    
    dtEnhanced.Ajaxtable.prototype = Object.create(dtEnhanced.table.prototype);
    
    dtEnhanced.Ajaxtable.defaultConfig = {
        "ajax"         : {},
        "autoload"      : true,
        "itemsRoot"     : null,
        "dataHandler"    : null
    };

    dtEnhanced.Ajaxtable.prototype.reload = function(){
        
        var self = this;
        
        this.clear();
        
        self.$table.dataTable()._fnProcessingDisplay(true);
        
        $.ajax(this.ajax).success(function(data){
            
            if(self.dataHandler)
                data = self.dataHandler(data);
            else{
                try{
                    data = JSON.parse(data);
                }catch(e){
                    console.error("cant parse data from ajax request : " + self.ajax.url);
                }
            }
            
            var items;
            
            if(self.itemsRoot){
                items = data[self.itemsRoot];
            }else{
                items = data;
            }
            
            for(var i in items){
                self.addItem(items[i]);
            }
            
        }).done(function(){
            self.$table.dataTable()._fnProcessingDisplay(false);
        });
        
    };

    dtEnhanced.Ajaxtable.prototype.show = function(elm,config){
        
        config = config || {};
        
        config.processing = true;
        
        dtEnhanced.table.prototype.show.apply(this,[elm,config]);
        
        if(this.autoload)
            this.reload();
    };
    
    
    
/*============== SERVERTABLE ==============*/

    /**
     * config example :
     * {
     *  ajax : { // jquery ajax config : http://api.jquery.com/jQuery.ajax/
     *      url : "myjson.json"
     *  },
     *  
     *  autoload : true,  // will load the ajax automatically on show
     *  
     *  itemsRoot : "items",  // handy shortcut when itemList is not at the root of the array
     *  
     *  dataHandler : function(data){  var processedData = doSomething(data); return processedData; }
     *  // allows to parse data on your one way. If null or not defined the default behaviour is to use JSON.parse(data)
     *  
     */
    dtEnhanced.Servertable = function(config){
        var newConf = {};
        
        jQuery.extend(
            newConf,
            dtEnhanced.Servertable.defaultConfig,
            config
        );
            
        dtEnhanced.table.apply(this,[newConf]);

    };
    
    dtEnhanced.Servertable.prototype = Object.create(dtEnhanced.table.prototype);
    
    dtEnhanced.Servertable.defaultConfig = {
        "ajax"         : {},
        "autoload"     : true,
        "processing"   : true
    };

    

    dtEnhanced.Servertable.prototype.show = function(elm,config){
        config = config || {};
        config.serverSide = true;
        config.ajax = this.ajax;
        config.processing = config.processing || this.processing;
        
        dtEnhanced.table.prototype.show.apply(this,[elm,config]);
    };


/*============== FIELD ==============*/

    /**

    Possible values for config :

        - field config : name,width,render,header,class,searchable,orderable,visible,type  // only name is mandatory
        - string => name config alone

    */
    dtEnhanced.field = function(config){

        var defaultConfig = {
            "name"      : "",
            "width"     : null,
            "render"    : null,
            "header"    : null,
            "class"     : null,
            "searchable": true,
            "orderable" : true,
            "visible"   : true,
            "type"      : "string"
        };

        // if not an object then it is the name only
        if(typeof config !== 'object'){

            jQuery.extend(this,defaultConfig,{
                "name":config
            });
        
        }else{

            jQuery.extend(this,defaultConfig,config);

        }

        this.orderDataType = this.type;

    };

    dtEnhanced.field.prototype = {

        /**
         * called to overide init of column definition. Usefull to do special stuff for special column type (checkable, details...)
         */
        _postInitDtColumnDef : function(table,definition){
            return definition;
        },

        makeHeaderCol : function(table){

            var $field = $("<th/>");

            // if user size, set it
            if(this.width>0)
                $field.css({"width":this.width + "px"});

            // set the title : header config, if not specified, then set the name instead
            $field.html(this.header ? this.header : this.name);

            return $field;

        },

        makeBodyCol : function(table,set){
    
            var $div = $("<div/>");
    
            // fill it
            if(this.render)
                $div.html(this.render(set[this.name],set,table.getItems));
            else
                $div.html(set[this.name]);

            return $div;

        },

        bindCol : function(table,td){
            
        }

    };






/*============== CHECKBOX FIELD ==============*/



    dtEnhanced.checkboxField = function(config){

        dtEnhanced.field.apply(this,[config]);
        this.width = 15;

    };

    dtEnhanced.checkboxField.prototype = Object.create(dtEnhanced.field.prototype);

    dtEnhanced.checkboxField.prototype.makeBodyCol = function(table,set){
        var $div = $("<div/>");
        $div.append("<div class='dtec-select-field' />");
        return $div;
    };
    
    
    
/*============== DETAILS CONTROL FIELD ==============*/
    
    /**
     * aditional config :
     * 
     * - content      : "view details"  // also possible as a callback : function(set,items,fullData)
     * - childContent : function(set,items,fullData)
     * 
     * childcontent mays overide the childContent defined on the table
     * 
     * @param {type} config
     * @returns {undefined}
     */
    dtEnhanced.detailsControlField = function(config){

        dtEnhanced.field.apply(this,[config]);
        this.width   = 15;
        this.content = config.content || "+";

    };

    dtEnhanced.detailsControlField.prototype = Object.create(dtEnhanced.field.prototype);

    dtEnhanced.detailsControlField.prototype.makeBodyCol = function(table,set){
        var $div = $("<div/>");
        var self = this;
        var $content = $("<div class='dtec-details-control'/>");
        
        if(this.content){
            if(( typeof(this.content) === "function" )){
                $content.html(this.content(set , table.getItems() , table.data ));
            }else{
                $content.html(this.content);
            }
        }
        
        $content.appendTo($div);
        
        return $div;
    };
    
    dtEnhanced.detailsControlField.prototype.bindCol = function(table,td){

        $(td).click(function(){

            var dtec = $(this).closest("table").data("dtec-object");
            var dt   = $(this).closest("table").DataTable();

            var $tr  = $(this).closest("tr");
            var row  = dt.row($tr);

            if( row.child.isShown() ){
                row.child.hide();
                $tr.removeClass('shown');
            }else{

                var callBack = null;

                if(self.childContent){
                    callBack = self.childContent;
                }else if(dtec.childContent){
                    callBack = dtec.childContent;
                }

                var content = callBack ? callBack(set , table.getItems() , table.data ) : "";
                row.child( content ).show();
                $tr.removeClass('shown');
            }

        });
        
    }
    
    
    /*============== HELPER parseColumns ==============*/
    
    dtEnhanced.parseColumns = function(jsonString,overides){
      
        var columns = JSON.parse(jsonString);
        
        overides = overides || {};
        
        var getColumnByName = function(name){
            for(var i in columns){
                if(columns[i].name === name){
                    return columns[i];
                }
            }
        };
        
        for(var i in overides){
            var col = getColumnByName(i);  
            $.extend(col,overides[i]);
        }
        
        return columns;
    };
    
    
    /*============== HELPER parseConfigs ==============*/
    
    dtEnhanced.parseConfigs = function(jsonString,overides){
      
        try{
            var config = JSON.parse(jsonString);
        }catch ($e){
            console.error("json not valid");
            return false;
        }
        
        overides = overides || {};
        
        $.extend(true,config,overides);
        
        return config;
    };
    
    
    /*============== HELPER creationHelper ==============*/
    
    dtEnhanced.creationHelper = function(configString,confOverides,columnString,columnsOverides){
        var columns = dtEnhanced.parseColumns(columnString,columnsOverides);
        var config  = dtEnhanced.parseConfigs(configString,confOverides);
        config.columns = columns;

        return config;
    };
    

    return dtEnhanced;

}(jQuery);