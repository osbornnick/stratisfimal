class TestCaseGenerator {
    constructor(){}

    permutator(inputArr) {
        var results = [];
      
        function permute(arr, memo) {
          var cur, memo = memo || [];
      
          for (var i = 0; i < arr.length; i++) {
            cur = arr.splice(i, 1);
            if (arr.length === 0) results.push(memo.concat(cur));
            permute(arr.slice(), memo.concat(cur));
            arr.splice(i, 0, cur[0]);
          }
          return results;
        }
        return permute(inputArr);
    }

    * subsets(array, length, start = 0) {
        if (start >= array.length || length < 1) {
            yield [];
        } else {
            while (start <= array.length - length) {
            let first = array[start];
            for (let subset of this.subsets(array, length - 1, start + 1)) {
                subset.push(first);
                yield subset;
            }
            ++start;
            }
        }
    }

    genRandomGraph (seed, maxNodesPerRank, maxDepth, childProb, randProb, selfProb, groupsEnabled = false, groupSpawnProb = 0.5, groupInclusionProb, groupExpandProb) {
        let g = new SimpleGraph();

        let s = {name: 's', depth: 0}
        g.addNode(s);

        this.rng = new Math.seedrandom(seed);
        let ucount = 0;

        let addChildren = (startnode) => {
            let numChildren = Math.round(this.rng() * maxNodesPerRank);

            for (let j=0; j<numChildren; j++){
                if (this.rng() < childProb && (g.nodeIndex[startnode.depth + 1] == undefined || g.nodeIndex[startnode.depth + 1].length < maxNodesPerRank)){
                    let u = {name: 'u' + ucount++, depth: startnode.depth + 1}
                    g.addNode(u);
                    g.addEdge({nodes: [startnode, u]});
                    if (u.depth + 1 < maxDepth) addChildren(u);
                    
                    // random edges
                    if (g.nodeIndex[u.depth + 1] != undefined) {
                        for (let node of g.nodeIndex[u.depth + 1]){
                            if (this.rng() < randProb && g.edges.find(e => e.nodes[0] == u && e.nodes[1] == node) == undefined) g.addEdge({nodes: [u, node]})
                        }
                    }

                    // self edges
                    if (g.nodeIndex[u.depth] != undefined) {
                        for (let node of g.nodeIndex[u.depth]){
                            if (node == u) continue;
                            if (this.rng() < selfProb && g.edges.find(e => (e.nodes[0] == u && e.nodes[1] == node) || (e.nodes[1] == u && e.nodes[0] == node)) == undefined) g.addEdge({nodes: [u, node]})
                        }
                    }
                }
            }
        }

        addChildren(s);

        if (groupsEnabled){
            for (let node of g.nodes){
                if (this.rng() < groupSpawnProb){
                    let group = {nodes: [node]}
                    let curDepth = node.depth;

                    let groupsInWhichNodeIsContained = new Set(g.groups.filter(gr => gr.nodes.includes(node)))

                    do {
                        for (let n2 of g.nodeIndex[curDepth].filter(n => n != node)){
                            let groupsInWhichN2IsContained = new Set(g.groups.filter(gr => gr.nodes.includes(n2)))

                            if (!this.eqSet(groupsInWhichNodeIsContained, groupsInWhichN2IsContained)) continue;
                            
                            if (this.rng() < groupInclusionProb){
                                // console.log(node.name, groupsInWhichNodeIsContained, n2.name, groupsInWhichN2IsContained, g.groups);
                                group.nodes.push(n2);
                            }
                        }

                        curDepth += 1
                    } while (this.rng() < groupExpandProb && curDepth < g.nodeIndex.length)
                    
                    if (group.nodes.length > 1)
                        g.addGroup(group)
                }
            }
        }

        return g;
    }


    eqSet(as, bs) {
        if (as.size !== bs.size) return false;
        for (var a of as) if (!bs.has(a)) return false;
        return true;
    }


    * gen2x2CrossingTest(){
        let u1 = {depth: 0, name: 'u1'};
        let v1 = {depth: 1, name: 'v1'};
        let u2 = {depth: 0, name: 'u2'};
        let v2 = {depth: 1, name: 'v2'};

        for (let perm1 of this.permutator([u1, u2])){
            for (let perm2 of this.permutator([v1, v2])){
                let g = new SimpleGraph();

                g.addNodes([perm1[0], perm2[0], perm1[1], perm2[1]]);
                g.addEdge({nodes: [u1, v1]});
                g.addEdge({nodes: [u2, v2]});

                let forceOrder = [
                    [perm1[0], perm1[1]],
                    [perm2[0], perm2[1]]
                ]

                let algorithm = new SimpleLp(g);
                algorithm.forceOrder(perm1[0], perm1[1]);
                algorithm.forceOrder(perm2[0], perm2[1]);
                algorithm.arrange();

                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};
            }
        }
    }

    * genTransitivityTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let u3 = {depth: 0, name: 'u3'};

        for (let sub1 of this.subsets([u1, u2, u3], 2)){
            for (let sub2 of this.subsets([u1, u2, u3], 2)){
                if (sub1[0].name == sub2[0].name || sub1[1].name == sub2[1].name) continue;

                for (let perm of this.permutator(sub1)){
                    for (let perm2 of this.permutator(sub2)){
                        let g = new SimpleGraph();

                        g.addNodes([u1, u2, u3]);
        
                        let algorithm = new SimpleLp(g);
        
                        let forceOrder = [[perm[0], perm[1]], [perm2[0], perm2[1]]];
                        algorithm.forceOrder(perm[0], perm[1]);
                        algorithm.forceOrder(perm2[0], perm2[1]);
        
                        algorithm.arrange();
                        algorithm.apply_solution();
        
                        yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};
                    }
                }
            }
        
        }
    }

    * genGroupTest(groupsize=2, outgroupsize=2){
        let allnodes = []

        for (let i=0; i<groupsize + outgroupsize; i++){
            allnodes.push({depth: 0, name: 'u' + i})
        }

        for (let sub1 of this.subsets(allnodes, groupsize)){
            let g = new SimpleGraph();
            let group = {nodes: sub1};

            g.addNodes(allnodes);
            g.addGroup(group);

            let algorithm = new SimpleLp(g);
            // algorithm.forceOrder(perm1[0], perm1[1]);
            // algorithm.forceOrder(perm2[0], perm2[1]);
            algorithm.arrange();

            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm};
        }
    }

    * genSameRankEdgesTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let v1 = {depth: 0, name: 'v1'};
        let v2 = {depth: 0, name: 'v2'};

        for (let perm of this.permutator([u1, u2, v1, v2])){
            let g = new SimpleGraph();

            g.addNodes([u1, u2, v1, v2]);
            g.addEdge({nodes:[u1, v1]})
            g.addEdge({nodes:[u2, v2]})

            let forceOrder = [
                [perm[0], perm[1]],
                [perm[1], perm[2]], 
                [perm[2], perm[3]],
                [perm[0], perm[2]],
                [perm[0], perm[3]],
                [perm[1], perm[3]]
            ];

            let algorithm = new SimpleLp(g);
            for (let f of forceOrder){
                algorithm.forceOrder(f[0], f[1])
            }

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
        }
    }

    * genSameRankEdgesPlusTwoRankEdgesTest(){
        for (let i = 0; i<2; i++){
            if (i == 0){
                let u1 = {depth: 0, name: 'u1'};
                let u2 = {depth: 0, name: 'u2'};
                let v1 = {depth: 0, name: 'v1'};
                let v2 = {depth: 1, name: 'v2'};

                for (let perm of this.permutator([u1, u2, v1])){
                    let g = new SimpleGraph();
        
                    g.addNodes([u1, u2, v1, v2]);
                    g.addEdge({nodes:[u1, v1]})
                    g.addEdge({nodes:[u2, v2]})
        
                    let forceOrder = [
                        [perm[0], perm[1]],
                        [perm[1], perm[2]],
                        [perm[0], perm[2]]
                    ];
        
                    let algorithm = new SimpleLp(g);
                    for (let f of forceOrder){
                        algorithm.forceOrder(f[0], f[1])
                    }
        
                    algorithm.arrange();
                    algorithm.apply_solution();
        
                    yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
                }
            }
            else {
                let u1 = {depth: 0, name: 'u1'};
                let u2 = {depth: 0, name: 'u2'};
                let v1 = {depth: 1, name: 'v1'};
                let v2 = {depth: 0, name: 'v2'};

                for (let perm of this.permutator([u1, u2, v2])){
                    let g = new SimpleGraph();
        
                    g.addNodes([u1, u2, v1, v2]);
                    g.addEdge({nodes:[u1, v1]})
                    g.addEdge({nodes:[u2, v2]})
        
                    let forceOrder = [
                        [perm[0], perm[1]],
                        [perm[1], perm[2]],
                        [perm[0], perm[2]]
                    ];
        
                    let algorithm = new SimpleLp(g);
                    for (let f of forceOrder){
                        algorithm.forceOrder(f[0], f[1])
                    }
        
                    algorithm.arrange();
                    algorithm.apply_solution();
        
                    yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
                }
            }
        }
    }

    * genSimpleAnchorTest(){
        let u1 = {depth: 0, name: 'u1'}
        let v1 = {depth: 2, name: 'v1'}

        for (let i=0; i<5; i++){
            let g = new SimpleGraph();

            if (i == 0){
                g.addNodes([u1, v1]);
            }
            if (i == 1) {
                g.addNodes([u1, v1]);
                g.addNodes([{depth: 1, name: 'u2'}]);
            }
            if (i == 2) {
                g.addNodes([u1, v1]);
                let u2 = {depth: 1, name: 'u2'};
                let v2 = {depth: 3, name: 'v2'}
                g.addNodes([u2, v2])
                g.addEdge({nodes: [u2, v2]})
            }
            if (i == 3) {
                v1.depth = 3;
                g.addNodes([u1, v1]);
            }
            if (i == 4) {
                v1.depth = 3;
                let u2 = {depth: 1, name: 'u2'};
                let v2 = {depth: 2, name: 'v2'}
                g.addNodes([u2, v2]);
                g.addNodes([u1, v1]);
                g.addEdge({nodes: [u2, v2]});
            }
            g.addEdge({nodes:[u1, v1]});
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm};  
        }
    }

    * genMultiRankGroupTest(){
        for (let i=0; i<3; i++){

            let g = new SimpleGraph();

            let ncount = 0;
            for (let j=0; j<3; j++){
                for (let k=0; k<4; k++){
                    g.addNode({depth: j, name: 'u' + ncount++})
                }
            }

            let group = {nodes: []}
            if (i == 0) group.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[10]]
            if (i == 1) group.nodes = [g.nodes[0], g.nodes[1], g.nodes[2], g.nodes[6], g.nodes[7], g.nodes[5], g.nodes[10], g.nodes[9]]
            if (i == 2) group.nodes = [g.nodes[1], g.nodes[7], g.nodes[9]]

            g.addGroup(group);
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            let forceOrder = [];

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
        }
    }

    * genNestedGroupTest(){
        for (let i=0; i<3; i++){

            let g = new SimpleGraph();

            let ncount = 0;
            for (let j=0; j<3; j++){
                for (let k=0; k<4; k++){
                    g.addNode({depth: j, name: 'u' + ncount++})
                }
            }

            let group1 = {nodes: []}
            let group2 = {nodes: []}
            if (i == 0) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[10]]
                group2.nodes = [g.nodes[2], g.nodes[5]]
            }
            if (i == 1) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[3], g.nodes[6], g.nodes[9], g.nodes[10]]
                group2.nodes = [g.nodes[2], g.nodes[5], g.nodes[1]]
            }
            if (i == 2) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[6]]
                group2.nodes = [g.nodes[2], g.nodes[5], g.nodes[1]]
            }

            g.addGroup(group1);
            g.addGroup(group2);
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            let forceOrder = [];

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
        }
    }

    * genSimpleBendinessReductionTest(bendiness_active=true){
        for (let i=0; i<4; i++){
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
    
                g.addNodes([u1, u2, u3, s])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2] })
                g.addEdge({nodes:[s, u3] })
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = bendiness_active;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
            if (i == 1){
                let maxNodesPerRank = 5;
                let maxDepth = 4;

                let g = this.genRandomGraph("caat", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.1)

                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = bendiness_active;
                algorithm.arrange();
                algorithm.apply_solution();

                yield {graph: g, algorithm: algorithm}; 
            }
            if (i == 2){
                let maxNodesPerRank = 4;
                let maxDepth = 4;

                let g = this.genRandomGraph("AAA", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)

                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = bendiness_active;
                algorithm.arrange();
                algorithm.apply_solution();

                yield {graph: g, algorithm: algorithm}; 
            }
            if (i == 3){
                let maxNodesPerRank = 4;
                let maxDepth = 4;

                let g = this.genRandomGraph("eee", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)

                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = bendiness_active;
                algorithm.arrange();
                algorithm.apply_solution();

                yield {graph: g, algorithm: algorithm}; 
            }
        }
    }

    * genGroupBendinessReductionTest(){
        for (let i=0; i<2; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let v1 = {name: 'v1', depth: 2}
    
                g.addNodes([u1, u2, u3, s, v1])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2]})
                g.addEdge({nodes:[s, u3]})
                g.addEdge({nodes:[u1, v1]})

                let group = {nodes: [u2, u1]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
            if (i == 1){
                let maxNodesPerRank = 4;
                let maxDepth = 4;
                let g = this.genRandomGraph("hello", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)

                let group = {nodes: [g.nodes[3], g.nodes[6], g.nodes[7]]}
                g.addGroup(group);

                group = {nodes: [g.nodes[8], g.nodes[5]]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * genMultiRankGroupBendinessReductionTest(){
        for (let i=0; i<2; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let u4 = {name: 'u4', depth: 1}
                let v1 = {name: 'v1', depth: 2}
                let v2 = {name: 'v2', depth: 2}
                let v3 = {name: 'v3', depth: 2}
    
                g.addNodes([u1, u2, u3, s, u4, v1, v2, v3])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2]})
                g.addEdge({nodes:[s, u3]})
                g.addEdge({nodes:[u1, v1]})
                g.addEdge({nodes:[u1, v2]})
                g.addEdge({nodes:[u1, v3]})
                g.addEdge({nodes:[s, u4]})

                let group = {nodes: [u1, v1, v3]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 1){
                let maxNodesPerRank = 4;
                let maxDepth = 4;
                let g = this.genRandomGraph("eee", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)

                let group = {nodes:[g.nodes[2], g.nodes[4]]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * genTestIssue1(){
        for (let i=0; i<1; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                // let v3 = {name: 'u7', depth: 1}
    
                g.addNodes([u1, u2, u4, u5])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                // algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * genVarReductionTest(){
        for (let i=4; i<6; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }

                algorithm.options.simplify_for_groups_enabled = false;
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 1){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.options.simplify_for_groups_enabled = true;
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 2){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
                let u9 = {name: 'u9', depth: 2}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8, u9])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }

                algorithm.options.simplify_for_groups_enabled = false;
                algorithm.options.bendiness_reduction_active = true;
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 3){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }

                algorithm.options.simplify_for_groups_enabled = true;
                algorithm.options.bendiness_reduction_active = true;
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 4){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);

                let group2 = {nodes: [u2, u5]}
                g.addGroup(group2)
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }

                algorithm.options.simplify_for_groups_enabled = false;
                algorithm.options.bendiness_reduction_active = true;
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 5){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 0}
                let u3 = {name: 'u3', depth: 0}
                let u4 = {name: 'u4', depth: 1}
                let u5 = {name: 'u5', depth: 1}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 0}
                let u8 = {name: 'u8', depth: 1}
    
                g.addNodes([u1, u2, u4, u5, u3, u6, u7, u8])
                g.addEdge({nodes:[u1, u5]})
                g.addEdge({nodes:[u2, u4]})

                let group = {nodes: [u2, u5, u3, u6]}
                g.addGroup(group);

                let group2 = {nodes: [u2, u5]}
                g.addGroup(group2)
    
                let algorithm = new SimpleLp(g);
    
                let forceOrder = [
                    [u1, u2]
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }

                algorithm.options.simplify_for_groups_enabled = true;
                algorithm.options.bendiness_reduction_active = true;
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * collapseVis(){
        for (let i=0; i<2; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let u1 = {name: 'u1', depth: 0}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let u4 = {name: 'u4', depth: 2}
                let u5 = {name: 'u5', depth: 2}
                let u6 = {name: 'u6', depth: 1}
                let u7 = {name: 'u7', depth: 3}
                let u8 = {name: 'u8', depth: 2}
                let u9 = {name: 'u9', depth: 3}
    
                g.addNodes([u1, u2, u3, u4, u5, u6, u7, u8, u9])
                g.addEdge({nodes:[u1, u2]})
                g.addEdge({nodes:[u2, u5]})
                g.addEdge({nodes:[u2, u4]})
                g.addEdge({nodes:[u1, u3]})
                g.addEdge({nodes:[u1, u6]})
                g.addEdge({nodes:[u8, u7]})
                g.addEdge({nodes:[u6, u8]})
                g.addEdge({nodes:[u8, u9]})

                let group = {nodes: [u2, u4, u5, u3]}
                g.addGroup(group);

                group = {nodes: [u8, u7, u9]}
                g.addGroup(group);
                group = {nodes: [u7, u9]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 

            if (i == 1){
                let g = new SimpleGraph();
            
                let s = {name: 'G', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                // let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 2}
                let u6 = {name: 'u6', depth: 1}

                let u2 = {name: 'u2', depth: 2}
                let u4 = {name: 'u4', depth: 2}
                let u5 = {name: 'u5', depth: 2}

                let u8 = {name: 'u8', depth: 2}
                let u7 = {name: 'u7', depth: 3}
                let u9 = {name: 'u9', depth: 3}

                let g1 = {name: 'g1', depth: 1}
                let g2 = {name: 'g2', depth: 1}

                let g3 = {name: 'g3', depth: 2}
    
                g.addNodes([s, u1, u6, g1, g2, u2, u3, u4, u5, u8, g3, u7, u9])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[g1, u3]})
                g.addEdge({nodes:[s, u6]})
                g.addEdge({nodes:[s, g1]})
                g.addEdge({nodes:[s, g2]})
                g.addEdge({nodes:[g1, u2]})
                g.addEdge({nodes:[g1, u4]})
                g.addEdge({nodes:[g1, u5]})

                g.addEdge({nodes:[g2, u8]})
                g.addEdge({nodes:[g2, g3]})
                g.addEdge({nodes:[g3, u7]})
                g.addEdge({nodes:[g3, u9]})
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * genBigGraph(){
        let maxNodesPerRank = 4;
        let maxDepth = 6;

        let g = this.genRandomGraph("ccvfdaat", maxNodesPerRank, maxDepth, 0.6, 0.05, 0.01, true, 0.5, 0.2, 0.7)

        let algorithm = new SimpleLp(g);
        algorithm.options.bendiness_reduction_active = true;
        algorithm.arrange();
        algorithm.apply_solution();

        yield {graph: g, algorithm: algorithm}; 
    }

    * genGroupCreationTest(){
        for (let i=0; i<4; i++){
            if (i == 0){
                let maxNodesPerRank = 3;
                let maxDepth = 4;
    
                let g = this.genRandomGraph("paat", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.1)
    
                yield {graph: g}; 
            }
            if (i == 1){
                let maxNodesPerRank = 5;
                let maxDepth = 4;
    
                let g = this.genRandomGraph("caat", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.1)
    
                yield {graph: g}; 
            }
            if (i == 2){
                let maxNodesPerRank = 4;
                let maxDepth = 4;
    
                let g = this.genRandomGraph("AAA", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)
    
                yield {graph: g}; 
            }
            if (i == 3){
                let maxNodesPerRank = 4;
                let maxDepth = 4;
    
                let g = this.genRandomGraph("eee", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.2)
    
                yield {graph: g}; 
            }
        }
    }

    * genGroupCreationTest2(){
        for (let i=0; i<2; i++){
            if (i == 0){
                let maxNodesPerRank = 5;
                let maxDepth = 7;
    
                let g = this.genRandomGraph("abc", maxNodesPerRank, maxDepth, 0.6, 0.3, 0.05)
    
                yield {graph: g}; 
            }
            if (i == 1){
                let maxNodesPerRank = 5;
                let maxDepth = 6;
    
                let g = this.genRandomGraph("aaaaab", maxNodesPerRank, maxDepth, 0.6, 0.2, 0.1)
    
                yield {graph: g}; 
            }
        }
    }
}