import {drawGrid} from './canvas'
const shapeLocator = (canvasContext,canvasWidth, canvasHeight,shapeInfo,tester) =>{
    const b = shapeInfo.unitBlockSize
    const blocksPerRow = canvasWidth / b
    const blocksPerColumn = canvasHeight / b
    let copyOfActiveShape = Object.assign({},shapeInfo)
    let doloop = true;
    
    copyOfActiveShape.cells =[]
    //add origin to absolute vertices needed for check
    const absoluteVerticesWithOrigin = [...shapeInfo.absoluteVertices,[shapeInfo.xPosition,shapeInfo.yPosition]]
    
    const stringifyAbsVertices = absoluteVerticesWithOrigin.map((v)=>{
      return v.join('-')
    })
    for(let i=0;i < blocksPerRow ; i++){
      if(!doloop)break
      for(let j=0; j<= blocksPerColumn ; j++){
        if(!doloop)break
        //check if current unit screen element is within bounding box of active shape
        const x = [i*b,(i*b)+b]
        const y = [j*b,(j*b)+b]
        
        const xIncluded = (x[0] >= shapeInfo.boundingBox[0])&&(x[1] <= shapeInfo.boundingBox[1])
        const yIncluded = (y[0] >= shapeInfo.boundingBox[2])&&(y[1] <= shapeInfo.boundingBox[3])
        let match = false
        if(xIncluded && yIncluded){
          
          //it is within bounding box
          //find true vertices of unit element
          const elementVertices = [[i*b,j*b],[i*b,(j*b)+b],[(i*b)+b,(j*b)+b],[(i*b)+b,j*b]]
          const stringElementVertices = elementVertices.map((v)=>{
            return v.join('-')
          })
          //how many of the element vertices are included in the absolute vertices ??
          const q = stringElementVertices.filter((v)=>{
            return stringifyAbsVertices.includes(v)
          })
          //Must have all 4 vertices included to verify element is within the shape , other wise just go to
          //the next cell down in the same column
          if (q.length === 4){
            match = true
            drawGrid(x[0],y[0],match,b,canvasContext)
            copyOfActiveShape.cells.push([i,j])
          }
          if(copyOfActiveShape.cells.length === 4)  doloop =false   
        }
      }
    }
    return copyOfActiveShape
}


export default shapeLocator