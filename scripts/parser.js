mj.modules.parser = (function() {
    var parser = null;
    var Pair = null;
    var Cards = [];
    
    //var text = '<?xml version="1.0" encoding="UTF-8"?> <mnemosyne core_version="1" time_of_start="1333951200" > <category active="1"> <name>&lt;default&gt;</name> </category> <item id="363633d8" u="0" gr="3" e="2.500" ac_rp="1" rt_rp="0" lps="0" ac_rp_l="1" rt_rp_l="0" l_rp="0" n_rp="3"> <cat>&lt;default&gt;</cat> <Q>jag</Q> <A>I</A> </item> <item id="5c8f34b1" u="0" gr="1" e="2.500" ac_rp="1" rt_rp="0" lps="0" ac_rp_l="1" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>ska</Q> <A>will</A> </item> <item id="f8c36976" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>l�ra</Q> <A>teach</A> </item> <item id="e0c22905" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>mig</Q> <A>me</A> </item> <item id="2d49b6a5" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>ett</Q> <A>a, an</A> </item> <item id="140c2ac5" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>nytt</Q> <A>new</A> </item> <item id="fa9b43d9" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>spr�k</Q> <A>language</A> </item> <item id="cc29aee3" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>att</Q> <A>that</A> </item> <item id="f94fc2b5" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>f�rst�</Q> <A>understand</A> </item> <item id="de5d4d31" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>vill</Q> <A>want</A> </item> <item id="d04cdc28" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>flera</Q> <A>several</A> </item> <item id="494188ba" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>nya</Q> <A>new</A> </item> <item id="245aa841" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>ord</Q> <A>word</A> </item> <item id="974fc365" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>och</Q> <A>and</A> </item> <item id="cf478d3d" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>fraser</Q> <A>phrases</A> </item> <item id="cf7ebe43" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>m�ste</Q> <A>must</A> </item> <item id="4a16d550" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>lyssna</Q> <A>listening</A> </item> <item id="5c791afb" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>mycket</Q> <A>a lot</A> </item> <item id="35ede40e" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>l�sa</Q> <A>read</A> </item> <item id="240fb29f" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>skapa</Q> <A>create, make</A> </item> <item id="6201b0a8" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>m�nga</Q> <A>many</A> </item> <item id="f639e14b" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>god</Q> <A>good</A> </item> <item id="465c0720" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>morgon</Q> <A>morning</A> </item> <item id="65db2fe2" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>kv�ll</Q> <A>evening</A> </item> <item id="59883dcb" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>natt</Q> <A>night</A> </item> <item id="8d248468" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>hej</Q> <A>hello</A> </item> <item id="4d941af6" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>d�</Q> <A>then</A> </item> <item id="c577e7e5" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>hur</Q> <A>how</A> </item> <item id="0c850940" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>�r</Q> <A>is, are</A> </item> <item id="dbe211b4" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>det</Q> <A>that\'s, the, it, that</A> </item> <item id="a23c62e5" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>bra</Q> <A>good, well</A> </item> <item id="dfa155ed" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>tack</Q> <A>thanks</A> </item> <item id="d2fdb270" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>sj�lv</Q> <A>self</A> </item> <item id="82e18af0" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>j�ttebra</Q> <A>very good, great</A> </item> <item id="bcc91446" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>vad</Q> <A>what</A> </item> <item id="24d0787c" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>heter</Q> <A>name</A> </item> <item id="1efdd88c" u="1" gr="0" e="2.500" ac_rp="0" rt_rp="0" lps="0" ac_rp_l="0" rt_rp_l="0" l_rp="0" n_rp="0"> <cat>&lt;default&gt;</cat> <Q>du</Q> <A>you</A> </item> </mnemosyne> ';
    var text = 'jag\tI\nska\twill\nl�ra\tteach\nmig\tme\nett\ta, an\nnytt\tnew\nspr�k\tlanguage';
    
    function setup() {
        Pair = mj.classes.Card;
    }
    
    function parse(){
      getXMLParser();
      
      if(isMnemosyneDoc(parser)){
        var cardNodes = parser.getElementsByTagName("item");
        for (var i = 0; i < cardNodes.length; i++) {
            Cards[i] = getXMLPair(cardNodes[i]);
        }
      } else {
        //TODO Parser Errors
        getParser();
        for (var i in parser) {
            Cards[i] = getPair(parser[i]);
        }
      }
    }
    
    function getXMLPair(cardNode){
        var fsFront = cardNode.getElementsByTagName("Q")[0].childNodes[0].nodeValue;
        var fsBack = cardNode.getElementsByTagName("A")[0].childNodes[0].nodeValue;
        var fiPairId = cardNode.getAttribute("id");
        
        return new Pair(fiPairId, fsFront, fsBack);
    }
    
    function getPair(parsedItem){
        var pair = parsedItem.split("\t");
        
        return new Pair(0, pair[0], pair[1]);
    }
    
    function getXMLParser(){
      if (window.DOMParser) {
        parser = new DOMParser();
        parser = parser.parseFromString(text,"text/xml");
      } else {
        // Internet Explorer
        parser = new ActiveXObject("Microsoft.XMLDOM");
        parser.async = false;
        parser.loadXML(text);
      }
    }
    
    function getParser(){
        parser = text.split("\n");
    }
    
    function isMnemosyneDoc(parser) {
      return parser.documentElement.nodeName == "mnemosyne";
    }
    
    function getCards(){
        return Cards;
    }
    
    return {
        setup : setup,
        parse : parse,
        getCards : getCards
    };
    
})();